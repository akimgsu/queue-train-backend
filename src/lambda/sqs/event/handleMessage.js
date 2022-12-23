var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1"
});

/*
일정 시간마다 대기열 숫자를 업데이트하는 함수. EventBridge Cron을 통해 생성된 SQS 메세지를 처리하는 형식으로 주기적으로 호출됨
*/

exports.handler = async function (event, context) {
    console.log(event);
    var docClient = new AWS.DynamoDB.DocumentClient();
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    console.log(JSON.stringify(event.Records[0].messageAttributes));
    await event.Records.reduce(async (previousPromise2, qMessage) => {
        await previousPromise2;
        return new Promise(async (resolve2, reject2) => {
            try {
                var queueUrl = process.env.event_queue_url;
                //현재 대기열 큐의 대기숫자 알아보기
                var params = {
                    QueueUrl: process.env.waiting_queue_url,
                    AttributeNames: [
                        "ApproximateNumberOfMessages",
                    ]
                };
                const queueInfo = await sqs.getQueueAttributes(params).promise();
                console.log(queueInfo);
                const queueNum = queueInfo.Attributes.ApproximateNumberOfMessages;


                //웹소켓으로 알림 준비
                const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                    apiVersion: '2018-11-29',
                    endpoint: `${process.env.socket_api_gateway_id}.execute-api.us-east-1.amazonaws.com/dev`
                });
                var params = {
                    TableName: process.env.waiting_ddb_name,
                };
                let result = await docClient.scan(params).promise();

                //현재 대기중인 모든 유저에 대해서 웹소캣 전달
                const postCalls = result.Items.map(async ({ connection_id }) => {
                    const dt = { ConnectionId: connection_id, Data: JSON.stringify({ status: "update", waitingNum: queueNum }) };
                    try {
                        await apigwManagementApi.postToConnection(dt).promise();
                    } catch (e) {
                        console.log(`Found stale connection, deleting ${connection_id}`);
                        var params = {
                            TableName: process.env.waiting_ddb_name,
                            Key: {
                                connection_id: connection_id
                            }
                        };
                        await docClient.delete(params).promise();
                    }
                });
                try {
                    await Promise.all(postCalls);
                } catch (e) {
                    return { statusCode: 500, body: e.stack };
                }
                //처리 후 메세지 삭제. (삭제 하지 않아도 Lambda가 알아서 삭제함 : 강의 참조)
                var deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: qMessage.receiptHandle
                };
                await sqs.deleteMessage(deleteParams).promise();
                resolve2("ok")
            }
            catch (e) {
                console.log(e);
                var deleteParams = {
                    QueueUrl: queueUrl,
                    ReceiptHandle: qMessage.receiptHandle
                };
                await sqs.deleteMessage(deleteParams).promise();
                reject2()
            }
        });
    }, Promise.resolve());
}

