const AWS = require('aws-sdk');

/*
유저가 등록 완료 버튼을 눌렀을 때 불리는 함수
*/

exports.handler = async (event, context) => {
    console.log(event);
    const inputObject = event.queryStringParameters;
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    //다음 처리가 시작될 수 있도록 큐에서 메세지를 삭제한다.  
    var deleteParams = {
        QueueUrl: process.env.waiting_queue_url,
        ReceiptHandle: inputObject.receipt_handle
    };
    await sqs.deleteMessage(deleteParams).promise();
    let response = {
        isBase64Encoded: false,
        statusCode: 200,

        body: "ok"
    };
    return response

}