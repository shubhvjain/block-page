

const extractLines = (inputString)=>{
  const regex = /^- [^:]+ : [^\n]+/gm;
  // const regex = /^- [^:]+ [^.\n]* : [^\n]+/gm;
  const matches = inputString.match(regex);
  if (matches) {
    return matches;
  } else {
    return [];
  }
}

const parseData = (text)=>{
  console.log(text)
  let lines = extractLines(text)
  console.log(lines)
  let obj = {}
  lines.map(line=>{
    let parts = line.split(":")
    let first  = parts.shift()
    first = first.replace("-","").replace(".","").trim()
    let rest = parts.join("")
    obj[first] = rest.trim()
  })
  return obj
}


// not in use :  

const parseData1 = (text)=>{
  let status = {valid:true,error:""}
  const regex = /^\t*-\s/g;
  let lines = text.split("\n")
  let list = []
  let currentIndex = 0
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // console.log(line)
    const match = line.match(regex);
    console.log(match)
    if(match){
      // find out the level of indent 
      
    }else{
      status.valid = false
      status.error = `Invalid list item at line ${index+1}`
      break;
    }
  }
  if(status.valid){
    status['list'] = list
  }
  return status
}

module.exports = { parseData}