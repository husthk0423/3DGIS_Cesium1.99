import fs from "fs";
import AdmZip from "adm-zip";
import Compressing from "compressing";
import cmd from "./cmd.js";
import Path from "path";
import fse from "fs-extra";
var __dirname = Path.resolve();
import replaceall from "replaceall";
class LoadCesiumZip{
    constructor(zipPath,tmpCesiumDir){
        this.zipPath = zipPath;
        this.cesium = new AdmZip(zipPath);
        this.tmpCesiumDir = tmpCesiumDir;
    }
    async rollbackAllFile(){
        console.log("delete dir " + this.tmpCesiumDir)
        fse.removeSync(this.tmpCesiumDir);
        console.log("uncompress dir " + this.zipPath)
        await Compressing.zip.uncompress(this.zipPath,this.tmpCesiumDir);
        console.log("npm install");
        await cmd('npm install',Path.join(__dirname, this.tmpCesiumDir));
    }
    async rollbackFile(files){
        let rollbackFiles = {};
        for(let index in files){
            let fileName = files[index];
            fileName = replaceall("\\","/",fileName.substr(2,fileName.length));
            let entry = this.cesium.getEntry(fileName);
            if(entry == null){
                console.log("delete file " + fileName);
                fileName = this.tmpCesiumDir + fileName;
                if(fs.existsSync(fileName)){
                    fs.unlinkSync(fileName);
                }
            }else {
                console.log("callback file " + fileName + " from " + this.zipPath)
                let buffer = entry.getData();
                fileName = this.tmpCesiumDir + fileName;
                fs.writeFileSync(fileName, buffer);
            }
        }
    }
}

export default LoadCesiumZip;

/*let a = new LoadCesiumZip("cesium.zip","./cesium/");
//a.rollbackAllFile();
let cc = fs.readFileSync('_modifyFile');
a.rollbackFile(JSON.parse(cc));*/
