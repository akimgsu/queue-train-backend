var AWS = require("aws-sdk");
AWS.config.update({
    region: "us-east-1"
});

/*
유저 대기열을 위한 Queue를 처리하는 함수
*/


exports.handler = async function (event, context) {

    console.log(event);

    //만약 Stepfuncions가 아닌 여기서 유저 대기시간을 기다릴 경우 필요함
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    //받은 SQS메세지들에 대해서 처리
    const proms = event.Records.map(async (qMessage) => {
        return new Promise(async (resolve2, reject2) => {
            try {
                var queueUrl = process.env.waiting_queue_url;
                const payloadBody = JSON.parse(qMessage.body);
                const connectionId = payloadBody.connection_id;

                //웹소켓을 통해 예약 시작 알림
                const apigwManagementApi = new AWS.ApiGatewayManagementApi({
                    apiVersion: '2018-11-29',
                    endpoint: `${process.env.socket_api_gateway_id}.execute-api.us-east-1.amazonaws.com/dev`
                });

                try {
                    //클라이언트에 알려주는 내용 : 이 메세지의 SQS receiptHandle, 이 메세지의 MessageGroupId,허용된 예약 시간(환경변수)
                    await apigwManagementApi.postToConnection({
                        ConnectionId: connectionId, Data: JSON.stringify({
                            status: "start",
                            receipt_handle: qMessage.receiptHandle,
                            messageGroupId: qMessage.attributes.MessageGroupId,
                            view_time: process.env.user_view_time_in_mill,
                        })
                    }).promise();
                } catch (e) {
                    console.log(e);
                }

                //만약 이 Lambda에서 기다릴경우 아래 주석 해제
                // await new Promise(resolve => setTimeout(resolve, process.env.user_view_time_in_mill));
                // try {
                //     await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify({ status: "end" }) }).promise();
                // } catch (e) {
                //     console.log(e);
                // }

                // var deleteParams = {
                //     QueueUrl: queueUrl,
                //     ReceiptHandle: qMessage.receiptHandle
                // };
                // await sqs.deleteMessage(deleteParams).promise();

                //대기를 위한 StepFunctions를 실행
                var stepfunctions = new AWS.StepFunctions();
                await stepfunctions.startExecution({
                    stateMachineArn: process.env.stepfunctions_arn,
                    input: JSON.stringify({
                        view_time: parseInt(process.env.user_view_time_in_mill / 1000),
                        receiptHandle: qMessage.receiptHandle,
                        connection_id: payloadBody.connection_id,
                        waitQueueURL: queueUrl
                    })
                }).promise();
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
    });
    try {
        await Promise.all(proms);
    } catch (e) {
        console.error(e);
    }
}

