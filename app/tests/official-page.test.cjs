const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('server/officialPage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject,require,URL,Buffer,TextDecoder,setTimeout,clearTimeout});
test('official fetch rejects internal and reserved destinations',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','192.168.1.27','172.16.0.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2002:7f00:1::'])assert.equal(exportsObject.publicAddress(ip),false,ip);
 assert.equal(exportsObject.publicAddress('93.184.216.34'),true);
});
test('official fetch rejects insecure schemes and credentials before networking',async()=>{
 for(const url of ['http://example.com','file:///etc/passwd','https://user:pass@example.com','https://example.com:8443'])await assert.rejects(exportsObject.readOfficialPage(url));
});
