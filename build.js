import fs from "fs";
import Path from "path";
var __dirname = Path.resolve();
import Walk from "walk";
const _markFilePath = "./_modifyFile";
const pathDir = ".\\Source";
const cesiumDir = ".\\cesium\\";
const cssDir = ".\\css\\";
import LoadCesiumZip from "./loadCesiumZip.js";
const cesiumZip = "cesium.zip";
const loadCesiumZip = new LoadCesiumZip(cesiumZip, cesiumDir);
import Cmd from "./cmd.js";
const buildPath = "Build\\";
import fse from "fs-extra";

let getModify = function (path) {
    let files = [];
    let walker = Walk.walk(path, { followLinks: false, filters: ["node_modules"] });
    walker.on('file', function (roots, stat, next) {
        files.push(roots + Path.sep + stat.name);
        next();
    });
    return new Promise(function (resolve, reject) {
        walker.on('end', function () {
            resolve(files);
        });
    })
}


let copyToDir = async function (files, dir) {
    for (let index in files) {
        let filePath = Path.resolve(__dirname, files[index]);
        let copyTo = Path.resolve(__dirname, dir + Path.sep + files[index]);
        let dirCopy = Path.dirname(copyTo);
        if (!fs.existsSync(dirCopy)) {
            // fs.mkdirSync(dirCopy);
            makeMultiDir(copyTo);
        }
        console.log("copy " + filePath + " to " + copyTo);
        fs.copyFileSync(filePath, copyTo);
    }
}


function makeMultiDir(dirpath) {
    if (!fs.existsSync(dirpath)) {
        var pathtmp;
        var pathArr = dirpath.split("\\");
        pathArr.pop();
        pathArr.forEach(function (dirname) {
            if (pathtmp) {
                pathtmp = Path.join(pathtmp, dirname);
            }
            else {
                //如果在linux系统中，第一个dirname的值为空，所以赋值为"/"
                if (dirname) {
                    pathtmp = dirname;
                } else {
                    pathtmp = "/";
                }
            }
            if (!fs.existsSync(pathtmp)) {
                if (!fs.mkdirSync(pathtmp)) {
                    return false;
                }
            }
        });
    }
    return true;
}

let getPreviousModifyFiles = function () {
    console.log('check previousModifyFiles');
    if (fs.existsSync(_markFilePath)) {
        let previousModifyFiles = fs.readFileSync(_markFilePath);
        previousModifyFiles = JSON.parse(previousModifyFiles);
        return previousModifyFiles;
    } else {
        throw "not exists file " + _markFilePath;
    }
}

let rollbackFiles = function (previousModifyFiles, modifyFiles) {
    // 本次修改没有 ，上次修改有则需要还原
    console.log('create rollbackFiles');
    let rollbackFile = [];
    for (let index in previousModifyFiles) {
        let fileName = previousModifyFiles[index];
        if (modifyFiles.indexOf(fileName) == -1) {
            rollbackFile.push(fileName);
        }
    }
    if (rollbackFile.length != 0) {
        console.log('rollbackFiles ' + rollbackFile);
        loadCesiumZip.rollbackFile(rollbackFile);
    } else {
        console.log('no rollbackFiles');
    }
}

let overWrite = async function (pathFrom, pathTo) {
    //先加载上次修改的文件
    let previousModifyFiles = [];
    try {
        previousModifyFiles = getPreviousModifyFiles();
    } catch (e) {
        console.log("can not load previous modify file,roll back all file");
        await loadCesiumZip.rollbackAllFile();
    }
    let files = await getModify(pathFrom);
    await rollbackFiles(previousModifyFiles, files);
    writeModifyFilesMark(files);
    await copyToDir(files, pathTo);
}

let readModifyFileMark = function () {
    let modify = fs.readFileSync(_markFilePath);
    return JSON.parse(modify);
}

let writeModifyFilesMark = function (files) {
    console.log("writeModifyFiles");
    let buffer = JSON.stringify(files);
    fs.writeFileSync(_markFilePath, buffer);
}




let deleteBuildDir = function (path) {
    console.log("delete dir " + path);
    fse.removeSync(path);
}


let buildCesium = async function (cmd, cesiumPath) {
    deleteBuildDir(cesiumPath + buildPath);
    fs.mkdirSync(cesiumPath + buildPath);

    let cmdStr = "npm run " + cmd;
    console.log(cmdStr);
    let pathStr = Path.join(__dirname, cesiumPath);

    console.log(Path.join(__dirname, cesiumPath));


    // Cmd('cd', pathStr);
    console.log("&&&&&&&&&&&&&&&&&&&&&");
    console.log(cmdStr);
    console.log(pathStr);
    console.log("&&&&&&&&&&&&&&&&&&&&&");

    await Cmd(cmdStr, pathStr);
}


let buildCopy = async function (buildCopyTo) {

}


let buildCustomCesium = async function (cmd) {
    let cmdStr = "npm run " + cmd;
    console.log(cmdStr);
    await Cmd(cmdStr, '');
}


//拷贝文件夹
let copyDir = function (src, dst) {
    //读取目录
    fs.readdir(src, function (err, paths) {
        console.log(paths)
        if (err) {
            throw err;
        }
        paths.forEach(function (path) {
            var _src = src + '/' + path;
            var _dst = dst + '/' + path;
            var readable;
            var writable;
            fs.stat(_src, function (err, st) {
                if (err) {
                    throw err;
                }

                if (st.isFile()) {
                    readable = fs.createReadStream(_src);//创建读取流
                    writable = fs.createWriteStream(_dst);//创建写入流
                    readable.pipe(writable);
                } else if (st.isDirectory()) {
                    exists(_src, _dst, copyDir);
                }
            });
        });
    });
}

let exists = function (src, dst, callback) {
    //测试某个路径下文件是否存在
    fs.exists(dst, function (exists) {
        if (exists) {//不存在
            callback(src, dst);
        } else {//存在
            fs.mkdir(dst, function () {//创建目录
                callback(src, dst)
            })
        }
    })
}


let uglifyjsCesium = async function (cmd) {
    let cmdStr = "npm run " + cmd;
    // console.log(cmdStr);
    try {
        await Cmd(cmdStr, '');
    } catch (e) {
        console.log(e.message);
    }
}

let go = async function (cmd, buildCopyTo) {
    //清空Build目录
    deleteBuildDir(buildPath);
    fs.mkdirSync(buildPath);

    await overWrite(pathDir, cesiumDir);


    if (cmd == 'release') {
        await buildCesium('release', cesiumDir);
    } else {
        await buildCesium(cmd, cesiumDir);
    }

    if (buildCopyTo == null) {
        await buildCopy(buildCopyTo);
    }

    // 拷贝编译好的cesium文件到Build目录下
    copyDir(cesiumDir + buildPath, buildPath);

    //拷贝css到Build目录下
    copyDir(cssDir, buildPath);



    // if (cmd == 'release') {
    //     // await uglifyjsCesium('uglifyjsCesium');
    //     //编译扩展自cesium的类
    //     await buildCustomCesium('buildCustom');
    //     await buildCustomCesium('uglifyjsCustom');
    // } else {
    //     //编译扩展自cesium的类
    //     await buildCustomCesium('buildDevCustom');
    // }
}

go("build");
// go("release");