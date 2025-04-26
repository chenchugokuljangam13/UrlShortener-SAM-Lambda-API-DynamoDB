import { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, PutCommand, GetCommand} from '@aws-sdk/lib-dynamodb'
import { error } from 'console';
import { json } from 'stream/consumers';
const client = new DynamoDBClient({
    region: "us-east-1"
})
const docClient = DynamoDBDocumentClient.from(client);
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
const getShortCode= (): string => {
    let chars = "";
    for (let i = 65; i <= 90; i++) chars += String.fromCharCode(i); 
    for (let i = 97; i <= 122; i++) chars += String.fromCharCode(i); 
    for (let i = 48; i <= 57; i++) chars += String.fromCharCode(i); 

    let res = "";
    for (let i = 0; i <= 7; i++) {
        const randomInd = Math.floor(Math.random() * chars.length);
        res += chars.charAt(randomInd);
    }
    return res;
}



export const lambdaHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    console.log(event)
    const httpMethod = event.requestContext.http.method;
    let body;
    if(event.queryStringParameters) {
        body = event.queryStringParameters
    } else if (event.body) {
        body = JSON.parse(event.body);
    }
    if (!body) {
        return {
            statusCode:400, // Status code for Invalid request
            body: JSON.stringify({
                error: "Please give query"
            })
        }
    }
    const tableName =  process.env.tableName;
    console.log(event)
    console.log(httpMethod)
    console.log(body)
    console.log(tableName)


    if (httpMethod === 'POST') {
        const longUrl = body.longUrl;
        if (!longUrl) {
            return {
                statusCode: 400, // Status code for Invalid or Bad Request
                body: JSON.stringify({
                    error: "Please enter the URL"
                })
            }
        }
        const shortCode = getShortCode();
        const params = {
            TableName: tableName,
            Item: {
                short_code: shortCode,
                long_url: longUrl
            }
        }
        try {
            await docClient.send(new PutCommand(params));
            return {
                statusCode: 201, // status code for Created
                body: JSON.stringify({
                    shortCode: shortCode,
                    longUrl: longUrl,
                    note: "Please save shortcode"
                })
            }
        } catch(error) {
            return {
                statusCode: 500, // status code for Internal Server Error
                body: JSON.stringify({
                    error: error
                })
            }
        }
    }else if (httpMethod === 'GET'){
        const shortCode = body.shortCode;
        console.log(shortCode)
        if (!shortCode) {
            return {
                statusCode: 402, // status code for Not Found
                body: JSON.stringify({
                    error: "Please enter shortcode"
                })
            }
        }
        const params = {
            TableName: tableName,
            Key: {
                short_code: shortCode
            }
        }
        try{
            const record = await docClient.send(new GetCommand(params));
            console.log(record)
            if (!record.Item) {
                return {
                    statusCode: 404, // status code for Not Found
                    body: JSON.stringify({
                        error: "Record not found please give valid shortcode"
                    })
                }
            }
            const longUrl = record.Item.long_url;
            return {
                statusCode: 302, // status code for Found
                headers: {
                    Location: longUrl
                },
                body: ""
            }
        } catch(error) {
            return {
                statusCode: 500, // status code for Internal Server Error
                body: JSON.stringify({
                    error: error
                })
            }
        }

    }
    return {
        statusCode: 405, // status code for Method Not Allowed
        body: JSON.stringify({
            error: "This method is not allowed"
        })
    }
};
