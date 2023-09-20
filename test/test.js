const { decode,encode } = require("block-page");
const u = require("./utils");
const a  = require("../src/actions")
const d = require("../src/datatype")

encodeAllTestFiles = async (testFiles) => {
  // testFiles = ["file1","1","2","3","4","5","6","7"];
  for (let index = 0; index < testFiles.length; index++) {
    const element = testFiles[index];
    file = await u.readFile("./files/" + element+".txt");
    console.log(file);
    obj = encode(file);
    await u.saveFile(obj, "./output/" + element+".json",true);
  }
}

decodeAllGeneratedFiles = async (testFiles) => {
  // testFiles = ["file1","1","2","3","4","5","6","7"];
  for (let index = 0; index < testFiles.length; index++) {
    const element = testFiles[index];
    file = await u.readFile("./output/" + element+".json",true);
    //console.log(file);
    obj = decode(file);
    await u.saveFile(obj, "./output/" + element+"_decoded.txt");
  }
}

let testDelete  = async(opt) =>{
  docObj = await u.readFile(opt.fileName,true)
  // delete independent block
  docObj1 = a.doDeleteBlock(docObj,opt.blockToDelete)
  await u.saveFile(docObj1,opt.outputFile,true)
}

let testEdit  = async(opt) =>{
  docObj = await u.readFile(opt.fileName,true)
  //console.log(docObj)
  // delete independent block
  docObj1 = a.doEditBlock(docObj,opt.blockToEdit,opt.change)
  await u.saveFile(docObj1,opt.outputFile,true)
}

let testDeleteEdge = async (opt)=>{
  docObj = await u.readFile(opt.fileName,true)
  // console.log(opt)
  // delete independent block
  docObj1 = a.doDeleteKGEdge(docObj,opt.fromBlock,opt.toBlock)
  await u.saveFile(docObj1,opt.outputFile,true)
}

tests1 = [
  {
    "fileName":"./output/5.json",
    "blockToDelete":"indep",
    "outputFile":"./output/5-1.json"
  },
  {
    "fileName":"./output/5.json",
    "blockToDelete":"indep-1",
    "outputFile":"./output/5-2.json"
  },
  {
    "fileName":"./output/6.json",
    "blockToDelete":"edit-1",
    "outputFile":"./output/6-2.json"
  }
]

tests2 = [
  {
    "fileName":"./output/6.json",
    "blockToEdit":"edit 1",
    "outputFile":"./output/6-1.json",
    "change":{"text":"This is the new text"}
  },
  {
    "fileName":"./output/6.json",
    "blockToEdit":"edit 2",
    "outputFile":"./output/6-2.json",
    "change":{"title":"This is the new title"}
  },
  {
    "fileName":"./output/6.json",
    "blockToEdit":"edit 3",
    "outputFile":"./output/6-3.json",
    "change":{"text":"This is the new text","title":"New title"}
  }
]
tests3 = [
  {
    "fileName":"./output/6.json",
    "outputFile":"./output/6-10.json",
    "fromBlock":"b1",
    "toBlock":"b2"
  },
  {
    "fileName":"./output/6.json",
    "outputFile":"./output/6-11.json",
    "fromBlock":"b4",
    "toBlock":"b5"
  }
]

tests4 = [
  {
    "fileName":"./output/8.json",
    "blockToEdit":"one",
    "outputFile":"./output/8-1.json",
    "change":{"title":"This is the new text"}
  },
]

const main = async ()=>{
  // tests1.map(t=>{testDelete(t)})
  tests4.map(t=>{testEdit(t)})
  // allFiles = ["file1","1","2","3","4","5","6","7"]
  // encodeAllTestFiles(allFiles);
  // decodeAllGeneratedFiles(allFiles);
  //f1 = ["8"]
  //encodeAllTestFiles(f1);
  // decodeAllGeneratedFiles(f1);
  //tests3.map(t=>{testDeleteEdge(t)})

}

let testDataType = ()=>{
  let samples = [
    `- item 1 : some value\n- item 2 : more value\nThis line is not included`,
    `some text\n- this is not item 1\m- this is a regular list`,
    `- item 1: val\n- invalid.value : because it has a dot in the key(not really!!)\n not really dot will be replaced with dash`,
    `- type : book\n- title : Awesome book\n- author : by SVJ\n- url : http://www.something.com/haha`
  ]
  samples.map(s=>{
    console.log(d.parseData(s))
  })
}

// testDataType()
main()
