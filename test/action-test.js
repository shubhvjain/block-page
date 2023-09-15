const u = require("./utils")

const a  = require("../src/actions")

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

const main = async ()=>{
  // tests1.map(t=>{testDelete(t)})
  tests2.map(t=>{testEdit(t)})
}

main()