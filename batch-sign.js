/**
* Copyright 2020 rowit Ltd.
* 
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    https://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
**************************************************************************
*
* This is an example bash script that takes 3 parameters:
* 1. The URL of the domain that is signing the files.
* 2. The path to the private key that coresponds to the URL in (1).
* 3. A path to a directory of files to be signed.
* 
* Once the files are signed it will upload the hash and signature for all the
* files to umpint.com servers in one requests. This will allow users to 
* authenticate at a later date.
*
* It will finally print out the result detailing status of the files it 
* signed.
*
**/

const fs = require('fs');
const path = require('path');
const forge = require('node-forge');
const crypto=require('crypto');
const https = require('https');
var myArgs = process.argv.slice(2);

console.log('myArgs: ', myArgs);
if(myArgs.length < 3) {
  console.log('You must pass 3 arguments - url, path_to_private_key, directory_of_files_to_sign');
  process.exit(1);
}


var url=myArgs[0]
try {
  var privateKeyFile = fs.readFileSync(myArgs[1]);
}catch(e) {
  console.log('Error reading file :'+myArgs[1]);
  process.exit(1);
}
privateKey = forge.pki.privateKeyFromPem(privateKeyFile);
const directoryPath = path.join(__dirname, myArgs[2]);
console.log('Uploading hashes of files in: ', myArgs[2])


const files=fs.readdirSync(myArgs[2])
var results=[]
files.forEach( function(file) {
  if(fs.existsSync(file) && fs.lstatSync(file).isFile()) {
    console.log("processing file:"+file);
    try {
      var dataFile = fs.readFileSync(myArgs[2]+'/'+file);
    }catch(e) {
      console.log('Error reading file :'+myArgs[2]);
    }

    var hash = crypto.createHash('sha256').update(dataFile).digest('hex');

    const md = forge.md.sha256.create();
    md.update(hash);
    const signature = privateKey.sign(md);
    const sigParam=forge.util.encode64(signature).replace(/\n/g,'').replace(/\+/g,'-').replace(/=/g,'_').replace(/\//g,'~').replace(/ /g,'');
    const result=[hash,sigParam]
    results.push(result)
  } else {
    console.log('Skipping [',file,'] as is not a file')
  }
});

console.log("sending:",results)

const data=JSON.stringify(results);

options= {
	hostname: 'umpint.com',
	port: 443,
	path: '/api/v1/sign/'+url,
	method: 'POST',
	headers: {
		'Content-Type':'application/json',
		'Content-Length': data.length
	}
}
console.log('\n\nResults was:\n')
const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`)
  res.on('data', (d) => {
    process.stdout.write(d)
  })
})

req.on('error', (error) => {
  console.error(error)
})

req.write(data)
req.end()
