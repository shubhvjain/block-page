const u = require("./utils")

const a  = require("../src/actions")

let testDelete  = async(opt) =>{
  docObj = await u.readFile(opt.fileName,true)

  // delete independent block
  docObj1 = a.doDeleteBlock(docObj,opt.blockToDelete)
  await u.saveFile(docObj1,opt.outputFile,true)
}

tests = [
  {
    "fileName":"./output/5.json",
    "blockToDelete":"indep",
    "outputFile":"./output/5-1.json"
  },
  {
    "fileName":"./output/5.json",
    "blockToDelete":"indep-1",
    "outputFile":"./output/5-2.json"
  }
]

const main = async ()=>{
  tests.map(t=>{
    testDelete(t)
  })
}

main()