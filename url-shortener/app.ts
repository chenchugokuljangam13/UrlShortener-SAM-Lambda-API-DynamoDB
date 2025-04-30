import {APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, PutCommand, GetCommand} from '@aws-sdk/lib-dynamodb';

// Initializing DynamoDB clients
const client = new DynamoDBClient({region: "us-east-1"})
const docClient = DynamoDBDocumentClient.from(client);

// Table name from DDB which is stored in Environment variables
const tableName =  process.env.TABLE_NAME;

// Generate a random 8-character alphanumeric short code if not given
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
    console.log("res")
    return res;
}

// Handle POST request: store long URL with a short code and Gives Short Code as response
const postRequestHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const body = event.body ? JSON.parse(event.body) : event.queryStringParameters;
    if (!body) {
        return {
            statusCode:400,
            // Status code for Invalid request
            body: JSON.stringify({
                error: "Please give query"
            })
        }
    }
    const longUrl = body.longUrl;
    if (!longUrl) {
        return {
            statusCode: 400,
            // Status code for Invalid or Bad Request
            body: JSON.stringify({
                error: "Please enter the URL"
            })
        }
    }
    const shortCode = body.shortCode || getShortCode()
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
            statusCode: 201,
            body: JSON.stringify({
                shortUrl: `https://${event.requestContext.domainName}/${event.requestContext.stage}/${shortCode}`
            })
        }
    } catch(error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal Server Error"
            })
        }
    }   
}

//Handle GET request: retrieve long URL using short code
const getRequestHandler = async(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const shortCode = event?.pathParameters?.shortCode
    if (!shortCode) {
        return {
            statusCode: 400,
            body: JSON.stringify({
             error: "Please enter shortCode"
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
                statusCode: 400,
                body: JSON.stringify({
                    error: "Record not found please give valid shortCode"
                })
            }
        }
        return {
            statusCode: 302,
            // status code for Redirecting
            headers: {
                Location: record.Item.long_url
            },
            body: JSON.stringify({
                longUrl: record.Item.long_url
            })
        }
    } catch(error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "Internal server error"
            })
        }
    }

}
   
// main Lambda function to handel the API
export const lambdaHandler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    console.log(event)
    const httpMethod = event.requestContext.http.method;
    if (httpMethod === 'POST') {
        // postRequestHandler handles the post request by using Event and it will return ShortCode
        return await postRequestHandler(event);
    }else if (httpMethod === 'GET'){
        // getRequestHandler handles the get request by using Event and it will redirect to original url
        return await getRequestHandler(event);
    } else {
        return {
            statusCode: 405,
            // status code for Method Not Allowed
            body: JSON.stringify({
                error: "This method is not allowed"
            })
        }    
    }
};
