const { OpenAI } = require('langchain/llms/openai');
const QueryHistory = require('../models/QueryHistory');
const Client = require('../models/Client');
const {
    CostExplorerClient,
    GetCostAndUsageCommand
} = require('@aws-sdk/client-cost-explorer');
const {
    LambdaClient,
    ListFunctionsCommand
} = require('@aws-sdk/client-lambda');

const llm = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7
});

async function getAWSCredentials(clientId) {
    const client = await Client.findById(clientId);
    if (!client) {
        throw new Error('Client not found');
    }
    return {
        accessKeyId: client.awsAccessKeyId,
        secretAccessKey: client.awsSecretAccessKey,
        region: client.awsRegion
    };
}

exports.processQuery = async (req, res) => {
    try {
        const { clientId, query } = req.body;
        const credentials = await getAWSCredentials(clientId);

        // Process query and get AWS data based on the query content
        let awsData = {};
        let response = '';

        if (query.toLowerCase().includes('lambda')) {
            const lambda = new LambdaClient({ credentials });
            const command = new ListFunctionsCommand({});
            const lambdaData = await lambda.send(command);
            awsData.lambdaFunctions = lambdaData.Functions;
        }

        if (query.toLowerCase().includes('cost') || query.toLowerCase().includes('billing')) {
            const costExplorer = new CostExplorerClient({ credentials });
            const command = new GetCostAndUsageCommand({
                TimePeriod: {
                    Start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    End: new Date().toISOString().split('T')[0]
                },
                Granularity: 'MONTHLY',
                Metrics: ['UnblendedCost']
            });
            const costData = await costExplorer.send(command);
            awsData.costs = costData.ResultsByTime;
        }

        // Use LangChain to generate a response based on the AWS data
        const prompt = `Given the following AWS data: ${JSON.stringify(awsData)}, 
                    answer the following question: ${query}`;
        
        response = await llm.predict(prompt);

        // Save query history
        const queryHistory = new QueryHistory({
            clientId,
            query,
            response,
            metadata: { awsDataCollected: Object.keys(awsData) }
        });
        await queryHistory.save();

        res.json({ response, awsData });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getQueryHistory = async (req, res) => {
    try {
        const { clientId } = req.params;
        const history = await QueryHistory.find({ clientId })
            .sort({ timestamp: -1 })
            .limit(50);
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

