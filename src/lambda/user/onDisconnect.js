const AWS = require('aws-sdk');


/*
웹소켓 연결이 종료되었을 때 처리되는 함수
*/
exports.handler = async event => {
  var docClient = new AWS.DynamoDB.DocumentClient();
  //웹소켓의 연결이 해제되면 Connection과 Queue에서 유저를 삭제한다.
  var params = {
    TableName: process.env.waiting_ddb_name,
    KeyConditionExpression: '#HashKey = :hkey',
    ExpressionAttributeNames: { '#HashKey': 'connection_id' },
    ExpressionAttributeValues: {
      ':hkey': event.requestContext.connectionId
    }
  };
  const result = await docClient.query(params).promise();

  var params = {
    TableName: process.env.waiting_ddb_name,
    Key: {
      connection_id: event.requestContext.connectionId
    }
  };
  await docClient.delete(params).promise();

  return "Disconnected";
};