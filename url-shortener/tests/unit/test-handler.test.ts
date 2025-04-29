import { APIGatewayProxyEvent, APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';
import { lambdaHandler } from '../../app';
import { expect, describe, it, beforeEach, test } from '@jest/globals';
import {mockClient} from 'aws-sdk-client-mock'
import {DynamoDBDocumentClient, GetCommand, PutCommand} from '@aws-sdk/lib-dynamodb'
process.env.tableName = 'URLShortener_gokul';
const ddbMock = mockClient(DynamoDBDocumentClient);
const event: APIGatewayProxyEventV2 = 
        {
            requestContext: {
                http: {
                    method: "",
                    path: '',
                    protocol: '',
                    sourceIp: '',
                    userAgent: ''
                },
                accountId: '',
                apiId: '',
                domainName: '',
                domainPrefix: '',
                requestId: '',
                routeKey: '',
                stage: '',
                time: '',
                timeEpoch: 0
            },
            version: '',
            routeKey: '',
            rawPath: '',
            rawQueryString: '',
            isBase64Encoded: false,
            headers: {}
        };
describe('Unit test for app handler', function () {
    beforeEach(() => {
        ddbMock.reset()
    })
    // GET response test cases
    test('verifies if user not given shortcode in GET method', async() => {
        event.requestContext.http.method = "GET"
        event.pathParameters = {shortCode: ""}
        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual(
            JSON.stringify({
                error: "Please enter shortCode"
            })
        )
    })
    test('verifies successful response in GET method', async () => {
        ddbMock.on(GetCommand).resolves({
            Item: {
                short_code: 'mwmHF4cA',
                long_url: 'www.youtube.com'
            }
        })
        event.pathParameters = {shortCode: "mwmHF4cA"}
        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result.statusCode).toBe(302);
        expect(result.headers).toEqual({
            Location: 'www.youtube.com'
        })
        expect(result.body).toEqual(
            JSON.stringify({
                longUrl: 'www.youtube.com'
            }),
        );
        
    });
    test('verifies that record found or not in GET method', async () => {
        ddbMock.on(GetCommand).resolves({})
        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual(
            JSON.stringify({
                error: "Record not found please give valid shortCode"
            })
        )
    })
    test('GET with DynamoDB GetCommand error', async () => {
        ddbMock.on(GetCommand).rejects(new Error("DDB error"));
        event.requestContext.http.method = "GET";
        event.pathParameters = { shortCode: "invalid" };
        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(500);
        expect(result.body).toContain("Internal server error");
    });
    // POST response test cases
    test('verifies that user have given body/queryStringParameters or not', async () => {
        event.requestContext.http.method = "POST"
        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual(
            JSON.stringify({
                error: `Please give query`
            })
        )
    })
    test('verifies if user not given longUrl in POST method', async() => {
        event.requestContext.http.method = "POST"
        event.queryStringParameters = {longUrl: ""}
        const result: APIGatewayProxyResult = await lambdaHandler(event);
        expect(result.statusCode).toBe(400);
        expect(result.body).toEqual(
            JSON.stringify({
                error: "Please enter the URL"
            })
        )
    })
    test('verifies successful response in POST method', async () => {
        ddbMock.on(PutCommand).resolves({})
        event.queryStringParameters = {longUrl: "www.americanExpress2025.com"}
        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(201);
    });
    test('POST with DynamoDB PutCommand error', async () => {
        ddbMock.on(PutCommand).rejects(new Error("DDB error"));
        event.requestContext.http.method = "POST";
        event.queryStringParameters = { longUrl: "www.youtube.com" };
        const result = await lambdaHandler(event);
        expect(result.statusCode).toBe(500);
        expect(result.body).toContain("Internal Server Error");
    });
    // response test case for methods other than POST and GET
    test('verifies successful response in other method', async () => {
        event.requestContext.http.method = "PUT"
        const result: APIGatewayProxyResult = await lambdaHandler(event);

        expect(result.statusCode).toBe(405);
        expect(result.body).toEqual(
            JSON.stringify({
                error: "This method is not allowed"
            }),
        );
    });

});
