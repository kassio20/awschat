const Client = require('../models/Client');

exports.createClient = async (req, res) => {
    try {
        const client = new Client(req.body);
        await client.save();
        
        // Don't send sensitive information back
        const clientResponse = {
            _id: client._id,
            name: client.name,
            awsAccountId: client.awsAccountId,
            awsRegion: client.awsRegion,
            active: client.active,
            createdAt: client.createdAt
        };
        
        res.status(201).json(clientResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.find({}, { awsAccessKeyId: 0, awsSecretAccessKey: 0 });
        res.json(clients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getClientById = async (req, res) => {
    try {
        const client = await Client.findById(req.params.id, { awsAccessKeyId: 0, awsSecretAccessKey: 0 });
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, select: '-awsAccessKeyId -awsSecretAccessKey' }
        );
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

