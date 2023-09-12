/**
 * to use the block program in the terminal
 */
 const fs = require("fs/promises");
const gDoc = require("./genDoc")

const getFile = async (filePath) => {
  const data = await fs.readFile(filePath, { encoding: "utf8" });
  return data;
}

const saveFile = async (filePath, fileContent) => {
  await fs.writeFile(filePath,fileContent)
}

const main = async ()=>{
  const progs = {
   'build':async ()=>{
      const inputPath = process.argv[2]
      if(!inputPath){throw new Error("Provide input file path : 1st arg")}

      const outputPath = process.argv[3]
      if(!outputPath){throw new Error("Provide output path file: 2nd arg")}
       
       const cmdType = process.argv[4]
       if(!cmdType){throw new Error("Provide command name : 3rd arg")}

      const entryBlock  = process.argv[5]
      if(!entryBlock){throw new Error("Provide entry block name: 4th arg")}

      try {
        const doc = await getFile(inputPath)
        const processedDoc  = await gDoc.generateOutput(doc,{type: cmdType , main:entryBlock})
        await saveFile(outputPath,processedDoc)
        console.log("Done!") 
      } catch (error) { console.log("Unble to generate output") }
   }
  }
  await  progs['build']()
 }
 
 
 main()
 .then(data=>{
 if(data){console.log(data)}
 }).catch(error=>{
 console.error(error)
 })
 
