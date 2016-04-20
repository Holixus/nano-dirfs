"use strict";

var assert = require('core-assert'),
    json = require('nano-json'),
    timer = require('nano-timer'),
    Promise = require('nano-promise'),
    util = require('util'),
    Path = require('path');


function uni_test(fn, sradix, dradix, args, expect) {
	test(fn.name+'('+json.js2str(args, sradix)+') -> '+json.js2str(expect, dradix)+'', function (done) {
		(args instanceof Array ? fn.apply(null, args) : fn.call(null, args))
			.then(function (ret) {
				assert.deepStrictEqual(ret, expect);
				done();
			}).catch(done);
	});
}

function massive(name, fn, pairs, sradix, dradix) {
	suite(name, function () {
		for (var i = 0, n = pairs.length; i < n; i += 2)
			uni_test(fn, sradix, dradix, pairs[i], pairs[i+1]);
	});
}

function fail_test(fn, sradix, dradix, args, ret, code) {
	test(fn.name+'('+json.js2str(args, sradix)+') -> '+ret.name+"('"+code+"')", function () {
		return (args instanceof Array ? fn.apply(null, args) : fn.call(null, args))
			.then(function () {
				throw Error('Missing expected exception');
			})
			.catch(function (err) {
				if (!(err instanceof ret) || err.code !== code) {
					throw err;
				}
			});
	});
}

function massive_fails(name, fn, pairs, sradix, dradix) {
	suite(name, function () {
		for (var i = 0, n = pairs.length; i < n; i += 3)
			fail_test(fn, sradix, dradix, pairs[i], pairs[i+1], pairs[i+2]);
	});
}


var DirFS = require('../dirfs.js'),
    test_folder = __dirname + '/src',
    sandbox = 1;

function init(content) {
	var fs = new DirFS(Path.join(test_folder, sandbox++ +''));
	return fs.mkpath('').then(function () {
		return fs.empty('');
	}).then(function () {
		return fs.writeTree('', content);
	}).then(function () {
		return fs;
	});
}

after(function () {
	return require('nano-fs').empty(test_folder);
});

suite('readFile', function () {
	var fs = {
		file: 'content',
		folder: {
			subfile: 'content'
		}
	};

	before(function () {
		return init(fs).then(function (_fs) {
			fs = _fs;
		});
	});

	function readFile(a) {
		return fs.readFile(a, 'utf8');
	}

	massive('goods', readFile, [
		'file', 'content',
		'folder/subfile', 'content',
		'./folder/.//subfile/.', 'content',
		'folder/fake/../subfile', 'content'
	]);

	massive_fails('fails', readFile, [
		'blah', Error, 'ENOENT',
		'folder', Error, 'EISDIR'
	]);
});


suite('writeFile', function () {
	function writeFile(a, c) {
		return init({ folder:{}, over:'o' }).then(function (fs) {
			return fs.writeFile(a, c).then(function () {
				return fs.readTree('');
			});
		});
	}

	massive('goods', writeFile, [
		['file', 'content'], { folder:{}, over:'o', file:'content' },
		['over', 'content'], { folder:{}, over:'content' },
		['folder/subfile', 'content'], { folder:{ subfile:'content' }, over:'o' },
		[ './folder/.//subfile/.', 'content'], { folder:{ subfile:'content' }, over:'o' },
		[ 'folder/fake/../subfile', 'content'], { folder:{ subfile:'content' }, over:'o' }
	]);

	massive_fails('fails', writeFile, [
		'folder', Error, 'EISDIR'
	]);
});


suite('unlink', function () {
	function unlink(a) {
		return init({ folder:{ subfile: 'o' }, over:'o' }).then(function (fs) {
			return fs.unlink(a).then(function () {
				return fs.readTree('');
			});
		});
	}

	massive('goods', unlink, [
		'over', { folder:{ subfile: 'o' } },
		'folder/subfile', { folder:{ }, over:'o' }
	]);

	massive_fails('fails', unlink, [
		'folder', Error, 'EISDIR'
	]);
});


suite('stat', function () {
	function stat(a, prop) {
		return init({ folder:{}, over:'o' }).then(function (fs) {
			return fs.stat(a).then(function (s) {
				return (typeof s[prop] === 'function') ? s[prop]() : s[prop];
			});
		});
	}

	massive('goods', stat, [
		['over', 'size'], 1,
		['over', 'isFile'], true,
		['over', 'isDirectory'], false,
		['over', 'isBlockDevice'], false,
		['over', 'isCharacterDevice'], false,
		['over', 'isSymbolicLink'], false,
		['over', 'isFIFO'], false,
		['over', 'isSocket'], false,

//		['folder', 'size'], 4096,
		['folder', 'isFile'], false,
		['folder', 'isDirectory'], true,
		['folder', 'isBlockDevice'], false,
		['folder', 'isCharacterDevice'], false,
		['folder', 'isSymbolicLink'], false,
		['folder', 'isFIFO'], false,
		['folder', 'isSocket'], false
	]);

	massive_fails('fails', stat, [
		'folders', Error, 'ENOENT'
	]);
});


suite('copy', function () {
	function copy(a, b) {
		return init({
				folder:{
					subfile:'p',
					subFile:'ere',
					subfolder: {
						o: 'o'
					} },
				Folder:{},
				over:'o'
		}).then(function (fs) {
			return fs.copy(a, b).then(function () {
				return fs.readTree('');
			});
		});
	}

	massive('goods', copy, [
		['folder/subfile', '/subfile'], { folder:{ subfile:'p', subFile:'ere', subfolder:{ o:'o' } }, Folder:{ }, over:'o', subfile:'p' },
		['folder/subfile', 'Folder/subfile'], { folder:{ subfile:'p', subFile:'ere', subfolder:{ o:'o' } }, Folder:{ subfile:'p' }, over:'o' },
		['over', '/folder/over'], { folder:{ subfile:'p', subFile:'ere', subfolder:{ o:'o' }, over:'o' }, Folder:{ }, over:'o' },
		['over', '/cop'], { folder:{ subfile:'p', subFile:'ere', subfolder:{ o:'o' } }, Folder:{ }, over:'o', cop:'o' },
		['over', '/folder/cop'], { folder:{ subfile:'p', subFile:'ere', subfolder:{ o:'o' }, cop:'o' }, Folder:{ }, over:'o' },
		['over', '/folder/subfile'], { folder:{ subfile:'o', subFile:'ere', subfolder:{ o:'o' } }, Folder:{ }, over:'o' }
	]);

	massive_fails('fails', copy, [
		['folder', 'Folder'], Error, 'EISDIR',
		['folder', 'Folder/al'], Error, 'EISDIR',
		['', 'Folder'], Error, 'EISDIR',
		['', ''], Error, 'EISDIR',
		[ 'folder', '' ], Error, 'EISDIR',
		[ 'folder/subfile', 'folder' ], Error, 'EISDIR',
		[ 'folder', 'over'], Error, 'EISDIR',
		[ 'fodder', 'over'], Error, 'ENOENT'
	]);
});


suite('listFiles', function () {
	function listFiles(a) {
		return init({
			folder:{
				subfile:'p',
				subFile:'ere' },
			Folder:{},
			over:'o'
		}).then(function (fs) {
			return fs.listFiles(a).then(function (s) {
				return s.sort();
			});
		});
	}

	massive('goods', listFiles, [
		'', [ 'folder/subFile', 'folder/subfile', 'over' ],
		'folder', [ 'subFile', 'subfile'],
		'Folder', []
	]);

	massive_fails('fails', listFiles, [
		'blah', Error, 'ENOENT',
		'over', Error, 'ENOTDIR'
	]);
});


suite('mkdir', function () {
	function mkdir(a, c) {
		return init({ folder:{ subfile: 'o' }, over:'o' }).then(function (fs) {
			return fs.mkdir(a, c).then(function (s) {
				return fs.readTree('');
			});
		});
	}

	massive('goods', mkdir, [
		'dir', { folder:{ subfile: 'o' }, over:'o', dir:{} },
		'folder/dir', { folder:{ subfile: 'o', dir:{} }, over:'o' }
	]);

	massive_fails('fails', mkdir, [
		'folder', Error, 'EEXIST',
		'folders/ok', Error, 'ENOENT'
	]);
});


suite('mkpath', function () {
	function mkpath(a, c) {
		return init({ folder:{ subfile: 'o' }, over:'o' }).then(function (fs) {
			return fs.mkpath(a, c).then(function (s) {
				return fs.readTree('');
			});
		});
	}

	function mkpath2(a, c) {
		return init({}).then(function (fs) {
			return fs.mkpath(a, c).then(function (s) {
				return fs.readTree('');
			});
		});
	}

	massive('goods', mkpath, [
		'dir', { folder:{ subfile: 'o' }, over:'o', dir:{} },
		'folder/dir', { folder:{ subfile: 'o', dir:{} }, over:'o' }
	]);

	massive('goods', mkpath2, [
		'dir', { dir:{} },
		'folder/dir', { folder:{ dir:{} } }
	]);

	massive_fails('fails', mkpath, [
		'over', Error, 'ENOTDIR'
	]);
});


suite('empty', function () {
	function empty(a, c) {
		return init({
			folder:{
				subfile:'p',
				subFile:'ere' },
			Folder:{},
			over:'o'
		}).then(function (fs) {
			return fs.empty(a).then(function () {
				return fs.readTree('');
			});
		});
	}

	massive('goods', empty, [
		'folder', { folder:{ }, Folder:{ }, over:'o' },
		'', { },
		'/', { }
	]);

	massive_fails('fails', empty, [
		'folder/subfile', Error, 'ENOTDIR',
		'folder/subfile/inf', Error, 'ENOTDIR',
		'foffer', Error, 'ENOENT'
	]);
});


suite('readTree', function () {
	test('.readTree(dir)', function () {
		var tree = {
		    	folder:{
		    		subfile:'p',
		    		subFile:'ere' },
		    	Folder:{},
		    	over:'o'
		    };
		return init(tree).then(function (fs) {
			return fs.readTree('').then(function (rdn) {
				assert.deepStrictEqual(rdn, tree);
			});
		});
	});
});


suite('writeTree', function () {
	test('.writeTree("", tree)', function () {
		var tree = {
		    	file: 'content',
		    	folder: {
		    		subfile: 'content'
		    	}
		    },
		    fs = init({});
		return init({}).then(function (fs) {
			return fs.writeTree('', tree).then(function () {
				return fs.readTree('');
			});
		}).then(function (rdn) {
			assert.deepStrictEqual(rdn, tree);
		});
	});

	test('.writeTree(dir, tree)', function () {
		var tree = {
		    	file: 'content',
		    	folder: {
		    		subfile: 'content'
		    	}
		    },
		    fs = init({});
		return init({}).then(function (fs) {
			return fs.writeTree('folder', tree.folder).then(function () {
				return fs.readTree('');
			});
		}).then(function (rdn) {
			assert.deepStrictEqual(rdn, { folder: tree.folder });
		});
	});

	test('.writeTree(dir, str)', function () {
		var tree = {
		    	file: 'content',
		    	folder: {
		    		subfile: 'content'
		    	}
		    },
		    fs = init({});
		return init({}).then(function (fs) {
			return fs.writeTree('file', tree.file).then(function () {
				return fs.readTree('');
			});
		}).then(function (rdn) {
			assert.deepStrictEqual(rdn, { file: tree.file });
		});
	});

	var tree = {
	    	file: 'content',
	    	folder: {
	    		subfile: 'content'
	    	}
	    };

	function wt(dir, val) {
		return init(tree).then(function (fs) {
			return fs.writeTree(dir, val);
		});
	}
	massive_fails('fails', wt, [
		[ 'file', {} ], Error, 'ENOTDIR'
	]);

});

