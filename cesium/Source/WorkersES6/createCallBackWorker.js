import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
function createCallBackWorker(workerFunction) {
  let postMessage;

  return function (event) {
    const data = event.data;
    let transferableObjects = [];
    let count = 0;
    let id = data.id;
    const responseMessage = {
      id: id,
      result: undefined,
      error: undefined,
    };



    function callBack(result){
      responseMessage.id = id -count;
      count ++;
      responseMessage.result = result;
      if (!defined(postMessage)) {
        postMessage = defaultValue(self.webkitPostMessage, self.postMessage);
      }

      if (!data.canTransferArrayBuffer) {
        transferableObjects.length = 0;
      }

      try {
        postMessage(responseMessage, transferableObjects);
      } catch (e) {
        // something went wrong trying to post the message, post a simpler
        // error that we can be sure will be cloneable
        responseMessage.result = undefined;
        responseMessage.error = `postMessage failed with error:`;
        postMessage(responseMessage);
      }finally{
        transferableObjects.pop();
      }
    }
     workerFunction(data.parameters, transferableObjects,callBack);
  };
}

export default createCallBackWorker;
