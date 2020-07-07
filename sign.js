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
* 3. A path to a single file to be signed.
* 
* Once the file is signed it will upload the hash and signature to the
* umpint.com servers to allow users to authenticate at a later date.
*
* It will finally print out the result detailing status of the file it 
* signed.
*
**/

const fs = require('fs');
const forge = require('node-forge');
const crypto=require('crypto');
const https = require('https');
var myArgs = process.argv.slice(2);

console.log('myArgs: ', myArgs);
if(myArgs.length < 3) {
  console.log('You must pass 3 arguments - url, path_to_private_key, file_to_sign');
  process.exit(1);
}
var url=myArgs[0];
try {
  // read private key from PEM file
  var privateKeyFile = fs.readFileSync(myArgs[1]);
}catch(e) {
  console.log('Error reading private key file: '+myArgs[1]);
  process.exit(2);
}
try {
  // read in file to hash/sign
  var dataFile = fs.readFileSync(myArgs[2]);
}catch(e) {
  console.log('Error reading file to sign: '+myArgs[2]);
  process.exit(3);
}

// create private key object
privateKey = forge.pki.privateKeyFromPem(privateKeyFile);

// compute sha256 hash of file in hex string format
var hash = crypto.createHash('sha256').update(dataFile).digest('hex');

// create signing object
const md = forge.md.sha256.create();
md.update(hash);
// compute signature
const signature = privateKey.sign(md);
// encode signature as url encoded base64 encoded signature
const sigParam=forge.util.encode64(signature).replace(/\n/g,'').replace(/\+/g,'-').replace(/=/g,'_').replace(/\//g,'~').replace(/ /g,'')

console.log('sending hash:',hash,' signature:', sigParam)

console.log('\n\nResult:')
// Send hash and signature to umpint servers
https.get('https://umpint.com/api/v1/sign/'+url+'?hash='+hash+'&sig='+sigParam, (resp) => {
  let data = '';
  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });
  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
