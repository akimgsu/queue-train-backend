const AWS = require('aws-sdk');
var moment = require('moment');

/*
웹소켓으로 접속 직후 처리되는 함수
*/

exports.handler = async (event) => {
    var docClient = new AWS.DynamoDB.DocumentClient();
    var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    //웹소켓에 접속하면 부여되는 connectionId를 DB에 저장한다.
    try {
        //유저 카운터를 하나 올리고 카운터 숫자를 가져온다.
        var paramsCounter = {
            TableName: process.env.waiting_counter_ddb_name,
            Key: { counter_id: 'counter' },
            UpdateExpression: 'set #a = #a + :x',
            ReturnValues: "UPDATED_NEW",
            ExpressionAttributeNames: { '#a': 'counter' },
            ExpressionAttributeValues: {
                ':x': 1,
            }
        };
        const resultCounter = await docClient.update(paramsCounter).promise();
        const count = resultCounter.Attributes.counter;

        //FIFO SQS Queue에 메세지를 넣는다. MessageGroupId 는 유저 카운터/%동시 처리 갯수 로 만듬
        var params = {
            MessageBody: JSON.stringify({ connection_id: event.requestContext.connectionId, timestamp: moment().valueOf() }),
            QueueUrl: process.env.waiting_queue_url,
            MessageGroupId: count % parseInt(process.env.concurrent) + "",
        }
        const result = await sqs.sendMessage(params).promise();
        const item = {
            messageGroupId: count % parseInt(process.env.concurrent) + "",
            connection_id: event.requestContext.connectionId,
            timestamp: moment().valueOf()
        }

        //DDB 테이블에 아이템을 넣기
        var params = {
            TableName: process.env.waiting_ddb_name,
            Item: item
        };
        await docClient.put(params).promise();
        let response = {
            statusCode: 200,
            body: "ok"
        };


        return response;
    } catch (e) {
        console.log(e);
        return "error";
    }

};