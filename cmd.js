import childProcess from "child_process";
export default function(cmd,path){

    let cmdArray = cmd.split(" ");
    let cmdName = cmdArray[0].trim();

    let cmdParam = [];
    for(let i = 1 ; i < cmdArray.length ; i ++){
        cmdParam.push(cmdArray[i].trim());
    }
    if(cmdName == 'npm'){
        cmdName = process.platform === "win32" ? "npm.cmd" : "npm";
    }

    // console.log(cmdName);
    // console.log(cmdParam);
    // console.log(path);
    
    let compressProcess;

    // compressProcess = childProcess.spawn(cmdName, cmdParam, {
    //             cwd: path
    //         });


    try{
        compressProcess = childProcess.spawn(cmdName, cmdParam, {
            cwd: path
        });
        compressProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
          });
        
          compressProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
          });
        
          compressProcess.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
          });
        
          compressProcess.on('error', (err) => {
            console.error('Failed to start subprocess.');
            console.error(err);
          });
    }
    catch(error)
    {
        console.error('Error caught11:');
        console.error(error);
    }

    return new Promise(function (resolve, reject) {
        compressProcess.once('error', function (err) {
            reject(err);
        });
        compressProcess.stdin.once('error', function (err) {
            reject(err);
        });
        compressProcess.stdout.once('error', function (err) {
            reject(err);
        });
        compressProcess.stdout.on('data', function (chunk) {

            console.log(chunk.toString());

        }.bind(this)).once('end', function () {
            console.log('done');
            resolve();
        }.bind(this));
    });

}
