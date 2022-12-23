const AWS = require('aws-sdk');

/*
대기열 접속 직후 업데이트 요청을 처리하기 위한 함수. 업데이트 내용은 대기열 숫자,메세지 그룹 Id
*/

exports.handler = async event => {

  console.log(event);
  const inputObject = JSON.parse(event.body);
  if (inputObject.message == "request_update") {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    var paramssqs = {
      QueueUrl: process.env.waiting_queue_url,
      AttributeNames: [
        "ApproximateNumberOfMessages",
      ]
    };
    const queueInfo = await sqs.getQueueAttributes(paramssqs).promise();
    console.log(queueInfo);
    const queueNum = queueInfo.Attributes.ApproximateNumberOfMessages

    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${process.env.socket_api_gateway_id}.execute-api.us-east-1.amazonaws.com/dev`
    });

    var params = {
      TableName: process.env.waiting_ddb_name,
      KeyConditionExpression: '#HashKey = :hkey',
      ExpressionAttributeNames: { '#HashKey': 'connection_id' },
      ExpressionAttributeValues: {
        ':hkey': event.requestContext.connectionId
      }
    };
    const result = await docClient.query(params).promise();
    const dt = { ConnectionId: event.requestContext.connectionId, Data: JSON.stringify({ status: "update", waitingNum: queueNum, messageGroupId: result.Items[0].messageGroupId }) };
    try {
      await apigwManagementApi.postToConnection(dt).promise();
    } catch (e) {
      console.log(`Found stale connection, deleting ${event.requestContext.connectionId}`);
      var params = {
        TableName: process.env.waiting_ddb_name,
        Key: {
          connection_id: event.requestContext.connectionId
        }
      };
      await docClient.delete(params).promise();
    }
    return {
      statusCode: 200,
      body: ""
    }
  }
  else {
    return {
      statusCode: 200,
      body: ""
    }
  }
};