var AWS = require("aws-sdk");
/*
EventBridge 규칙에 의해 1분마다 불리는 함수
*/
AWS.config.update({
    region: "us-east-1"
});
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
exports.handler = async function (event, context) {
    console.log(event);
    var params = {
        MessageBody: JSON.stringify({ notification: "test" }),
        QueueUrl: process.env.event_queue_url
    }
    //Interval만큼 SQS Queue에 메세지 생성   
    let invertal = process.env.notification_interval;
    for (var i = 0; i < (60 / invertal); i++) {
        if (i != 0) {
            params["DelaySeconds"] = i * invertal;
        }
        try {
            await sqs.sendMessage(params).promise();
        }
        catch (e) {
            console.log(e);
        }
    }
}

