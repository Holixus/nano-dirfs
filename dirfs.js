
var fs = require('nano-fs'),
    Path = require('path');

function DirFS(path) {
	this.folder = path;
}

DirFS.prototype = {
	complete: function (path) {
		return Path.join(this.folder, path);
	},

	readFile: function (path, opts) {
		return fs.readFile(this.complete(path), opts);
	},

	writeFile: function (path, data, opts) {
		return fs.writeFile(this.complete(path), data, opts);
	},

	copy: function (src, dst) {
		return fs.copy(this.complete(src), this.complete(dst));
	},

	stat: function (path) {
		return fs.stat(this.complete(path));
	},

	unlink: function (path) {
		return fs.unlink(this.complete(path));
	},

	listFiles: function (path, re) {
		return fs.listFiles(this.complete(path), re);
	},

	mkdir: function (path, mode) {
		return fs.mkdir(this.complete(path), mode);
	},

	mkpath: function (path, mode) {
		return fs.mkpath(this.complete(path), mode);
	},

	empty: function (path) {
		return fs.empty(this.complete(path));
	},

	readTree: function (path) {
		return fs.readTree(this.complete(path));
	},

	writeTree: function (path, obj) {
		return fs.writeTree(this.complete(path), obj);
	}
};

module.exports = DirFS;
