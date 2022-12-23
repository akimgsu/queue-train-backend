const AWS = require('aws-sdk');


/*
StepFunctions에서 유저에게 예약시간 만료를 알려주기 위해 불리는 함수
*/

exports.handler = async (event, context) => {
    console.log(event);
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: `${process.env.socket_api_gateway_id}.execute-api.us-east-1.amazonaws.com/dev`
    });
    try {
        await apigwManagementApi.postToConnection({ ConnectionId: event.connection_id, Data: JSON.stringify({ status: "end" }) }).promise();
    } catch (e) {
        console.log(e);
    }
    return { waitQueueURL: event.waitQueueURL, receiptHandle: event.receiptHandle }
}