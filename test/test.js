const { decode,encode } = require("block-page");
const u = require("./utils");

encodeAllTestFiles = async () => {
  testFiles = ["file1","1","2","3","4","5","6","7"];
  for (let index = 0; index < testFiles.length; index++) {
    const element = testFiles[index];
    file = await u.readFile("./files/" + element+".txt");
    console.log(file);
    obj = encode(file);
    await u.saveFile(obj, "./output/" + element+".json",true);
  }
};

decodeAllGeneratedFiles = async () => {
  testFiles = ["file1","1","2","3","4","5","6","7"];
  for (let index = 0; index < testFiles.length; index++) {
    const element = testFiles[index];
    file = await u.readFile("./output/" + element+".json",true);
    //console.log(file);
    obj = decode(file);
    await u.saveFile(obj, "./output/" + element+"_decoded.txt");
  }
};

encodeAllTestFiles();
// decodeAllGeneratedFiles();