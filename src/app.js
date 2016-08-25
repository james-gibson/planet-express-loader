'use strict';

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const jsforce = require('jsforce');
const config = require('../config.json');


function app(username, password, filePath) {
	readFileNames(filePath).then(result => {
	    // parse CSV files
        console.log('Found ' + result.length + ' csv file(s)');
        const conversionPromises = result.map(x => {
            return new Promise((resolve, reject) => {
                const salesforceObjectName = x.slice(0, -4);
                console.log('Processing: ', salesforceObjectName); 
                                
                convertCsvToObject(x).then(conversionResult => {
                    let result = {};
                    result.name = salesforceObjectName;
                    result.data = conversionResult;
                    resolve(result);
                });    
            });
        });
        Promise.all(conversionPromises).then(results => {
            let temp = {};
            results.map(x => {
                temp[x.name] = x.data;    
            })
            uploadDataToSf(username, password, temp);
        }).catch(err => {throw new Error(err);});
            

        console.log(data);
                
    }).catch(err => {
		throw new Error(err);
	})
}

function readFileNames(inputPath) {
	return new Promise((resolve, reject) => {
		fs.readdir(inputPath, (err, files) => {
			if(err) { return reject(err); }
			
			const fileDetails = files.map(x => path.join(inputPath, x)).filter(file => {
				const stat = fs.statSync(file);
				return stat.isFile() && file.includes('.csv')
			});

            resolve(fileDetails);
		});
	})
}

function convertCsvToObject(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', function (err,data) {
            if (err) { return reject(err); }
            
            const parseConfig = {
                comments: true,
                dynamicTyping: true,
                header: true,
                skipEmptyLines: true
            };

            const result = Papa.parse(data, parseConfig);
            
            return resolve(result.data);
        }); 

    });
}

function uploadDataToSf(username, password, dataByObject) {
	const conn = new jsforce.Connection({
	  // you can change loginUrl to connect to sandbox or prerelease env.
	  // loginUrl : 'https://test.salesforce.com'
	});
	console.log('Signing in with credentials.');
    conn.login(username, password, function(err, userInfo) {
        if (err) { return console.error(err); }
        // Now you can get the access token and instance URL information.
        // Save them to establish connection next time.
        console.log('Access Token (confidential): ', conn.accessToken);
        console.log('Instance Url: ',conn.instanceUrl);
        // logged in user property
        console.log("User ID: " + userInfo.id);
        console.log("Org ID: " + userInfo.organizationId);
        processUpload(conn.accessToken, conn.instanceUrl, dataByObject);
    });        
};

function processUpload(token,instance,data) {
    let conn = new jsforce.Connection({instanceUrl: instance, accessToken: token});
    //console.log(config,data);
    config['importOrder'].map(name => {
        //console.log(data[name]);
        if(typeof data[name] === 'undefined') {return;}

        processRecursively(conn,name,chunk(data[name],5));

        function processRecursively(conn, name, data) {
            if(!data.length) {return;}
            let dataToProcess = data.pop();
            console.log('Uploading ' + dataToProcess.length + ' ' + name + '(s)');
            upload(conn,name,dataToProcess).then(result => {
                processRecursively(conn,name,data);
            });
        }
    });

    function chunk (arr, size) {
        var chunks = [],
            i = 0,
            n = arr.length;

        while (i < n) {
            chunks.push(arr.slice(i, i += size));
        }
        return chunks;
    }
}

function upload(conn, objectName, data) {
    return new Promise((resolve, reject) => {
        conn.sobject(objectName).create(data,
    (err, rets) => {
        if (err) { throw new Error(err); }
        for (var i=0; i < rets.length; i++) {
            if (rets[i].success) {
                console.log("Created record id : " + rets[i].id);
            }
        }
        return resolve(rets);
    });
});
}

exports.app = app;
