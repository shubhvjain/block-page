const block = require("./block")
const blockTest = require("../test/block")
const graph = require("./graph")

const genDocObjAndValidate = (doc,options)=>{
  let Document 
  if(options.DEV){
    Document = blockTest.generateDocumentObject(doc,options) 
  }else{
    Document = block.generateDocumentObject(doc,options) 
  }
  if(Document.valid){
    return Document
  }else{
    throw new Error(`[Following errors found] ${Document.errors.map(itm=>itm.text).join("\n")}`)
  }
}

const generateOutput = async (doc,options={ type:"file-with-entry"})=>{
  if(!options.type){throw new Error("No doc type specified")}
  const docTypes = {
    "file-with-entry": async ()=>{
      if(!options.main){throw new Error("Specify the main block Id which contains the code")}
      const Document = genDocObjAndValidate(doc,options) 
      return Document['data'][options.main]['text']
    },
    "doc-obj": async ()=>{
      const Document = genDocObjAndValidate(doc,options) 
      return JSON.stringify(Document,null,2)
    },
    "explorer": async ()=>{
      const Document = genDocObjAndValidate(doc,options) 
      console.log(Document)
      const allGraphs = [ Document.graphs.deps, Document.graphs.knowledge, Document.graphs.dfsTree, Document.graphs.tsTree ]
      const graphHTML = await graph.generateGraphPreview(allGraphs,{format:'htmlParts'})
      const sanitizeArrows = (text)=>{
        let sText = text.replaceAll("<","&lt;").replaceAll(">","&gt;")
        return sText
      }
      let explorerHTML = `<!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <meta http-equiv="X-UA-Compatible" content="IE=edge" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Document Explorer</title>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet"/>
              ${graphHTML.head}
            </head>
            <body>
              <style>.graph { width: 90%; height: 80vh; border: 1px solid #80808036; }</style>
              <div class="container-lg">
                <div class="row">
                  <div class="col-lg-12">
                    <h3>Document explorer</h3>
                    <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                      <li class="nav-item" role="presentation"> <button class="nav-link active" id="pills-source-tab" data-bs-toggle="pill" data-bs-target="#pills-source" type="button" role="tab" aria-controls="pills-source" aria-selected="true">Source</button></li>
                      <li class="nav-item" role="presentation"><button class="nav-link" id="pills-graph-tab" data-bs-toggle="pill" data-bs-target="#pills-graph" type="button" role="tab" aria-controls="pills-graph" aria-selected="false">Graphs</button></li>
                      <li class="nav-item" role="presentation"><button class="nav-link" id="pills-action-tab" data-bs-toggle="pill" data-bs-target="#pills-action" type="button" role="tab" aria-controls="pills-action" aria-selected="false">Actions</button></li>
                    </ul>
                    <div class="tab-content" id="pills-tabContent">
                      <div class="tab-pane fade show active" id="pills-source" role="tabpanel" aria-labelledby="pills-source-tab" tabindex="0">
                        <div class="row">
                          <div class="col-lg-6"> <h4> Source </h4> <pre>${sanitizeArrows(doc)}</pre></div>
                          <div class="col-lg-6"> <h4> Document object </h4> <pre>${sanitizeArrows(JSON.stringify(Document.data,null,1))}</pre></div>
                        </div>
                      </div>
                      <div class="tab-pane fade" id="pills-graph" role="tabpanel" aria-labelledby="pills-graph-tab" tabindex="0">
                        ${graphHTML.body}
                      </div>
                      <div class="tab-pane fade" id="pills-action" role="tabpanel" aria-labelledby="pills-action-tab" tabindex="0">...</div>
                    </div>
                  </div>
                </div>
              </div>
            </body>
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js"></script>
          </html> `
      return explorerHTML
    },
    "kg": async ()=>{
      const Document = genDocObjAndValidate(doc,options)
      const allGraphs = [Document.graphs.knowledge]
      const graphHTML = await graph.generateGraphPreview(allGraphs,{format:'htmlParts',showVertexCreatedOrder:true })
      const sanitizeArrows = (text)=>{
        let sText = text.replaceAll("<","&lt;").replaceAll(">","&gt;")
        return sText
      }
      let kgHTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document Explorer</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css" rel="stylesheet" />
    ${graphHTML.head}
      <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.2/MathJax.js?config=TeX-MML-AM_CHTML"></script>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script>
      MathJax.Hub.Config({
      showMathMenu: false,
      tex2jax: { inlineMath: [["\$", "\$"]],displayMath:[["\$\$", "\$\$"]] },
      menuSettings: { zoom: "Double-Click", zscale: "150%" },
      CommonHTML: { linebreaks: { automatic: true } },
      "HTML-CSS": { linebreaks: { automatic: true } },
      SVG: { linebreaks: { automatic: true } }
    });
    </script>
  </head>
  <body>
    <style>.graph { width: 90%; height: 80vh; border: 1px solid #80808036;} </style>
    <div class="container-lg">
      <div class="row">
        <div class="col-lg-7">
          ${graphHTML.body}
          <script>
            const blockContent = ${JSON.stringify(Document)}
            network0.on("click", function(event) {
              if (event.nodes.length == 1) {showBlockContent(event.nodes[0])}
            })
            const renderMaths = ()=>{MathJax['Hub'].Queue(["Typeset", MathJax.Hub], 'nodeDetails')}
            let showBlockContent = (blockName) => {
              let blockData = blockContent.data[blockName]
              const stringToMD = (text)=>{return marked.parse(text)}
              const convertors = {
                'default': (data) => {
                  return \`<div> \${stringToMD(data.text)}</div>\`
                },
                'key-value': (data) => {
                	let objToTable = (obj)=>{
                  	let objKeys = Object.keys(obj)
                    let tab = \`\`
                    if(objKeys.length==1 && objKeys[0]=='text'){
                     tab =  \`<p>\${obj.text}</p>\`
                    }else{
                    	objKeys.map(ky=>{
                      	if(ky=='text'){ tab += \`<p>\${obj[ky]}</p>\` }
                        else{ tab += \`<p> <b>\${ky}</b> : \${obj[ky]} </p>\`}
                      })
                    }
                    return tab
                  }
                	let allkeys = Object.keys(data.value.keyValueData)
                  let tab= \` \`
                  allkeys.map(ky=>{
                  tab += \`<tr> <td> <b>\${ky}</b></td><td> \${objToTable(data.value.keyValueData[ky])} </td></tr>\`
                  })
                  return \`<p>\${data.title?data.title:""}</p><table class="table"> \${tab} </table>\`
                },
                'list': (data) => {
                	let lt = data.value.listData
                  lt.shift()
                  let litag = ""
                  lt.map(l=>{ litag += \`<li>\${l.text}</li>\`  })
                  return \`<p>\${data.title?data.title:""}</p><ul>\${litag}</ul>\`
                },
                'resource-list': (data) => {
                  let ress = data.value.resourceListData
                  let rkeys = Object.keys(ress)
                  let cards = \` \`
                  rkeys.map(res=>{
                  	let rData = ress[res]
                    console.log(rData)
                    cards += \`
                      <div class="card">
  <div class="card-body">
    <h5 class="card-title"><code>\${res}</code> | \${rData.title|| 'Resource'}</h5>
    <p> Path: \${rData.path}</p><a href="\${rData.path}" target="_blank">Open</a></div></div> <br>\`
                  })
                  return cards
                },
                'csv': (data) => {
                	let cv = data.value.csvData
                  let tab = \`\`
                  cv.map((c,index)=>{
                  	tab += "<tr>"
                  	c.map(cc=>{
                    	if(index==0){ tab += \`<th>\${cc}</th>\`
                      }else{tab += \`<td>\${cc}</td>\`}
                    })
  									tab += "</tr>"
                  })
                  return \`<p>\${data.title?data.title:""}</p><table class="table table-striped-columns"> \${tab} </table>\`
                }
              }
              let htmlcontent = convertors[blockData.dataType](blockData)
              const divId = document.getElementById("nodeDetails")
              divId.innerHTML = \`<h3> \${blockName}</h3><hr> \${htmlcontent} \`
						renderMaths()
            }
          </script>
        </div>
        <div class="col-lg-5">
          <div id="nodeDetails">
            <p class="text-secondary">Click on a node to show it's content</p>
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-lg-12">
          <details>
            <summary> Details </summary>
            <h4> Source </h4>
            <pre>${sanitizeArrows(doc)}</pre>
            <hr>
            <h4> Document object </h4>
            <pre>${sanitizeArrows(JSON.stringify(Document.data,null,1))}</pre>
          </details>
        </div>
      </div>
    </div>
  </body>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js"></script>
</html>`
      return kgHTML
    },
    "html-with-entry": async ()=>{
      if(!options.main){throw new Error("Specify the main block Id which contains the code")}
      const Document = genDocObjAndValidate(doc,options) 
      let blockContent =  Document['data'][options.main]['text']
            let htmlPage = `
            <!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <title>Document</title>
    <script>MathJax = {tex: { inlineMath: [['$', '$']], displayMath:[['$$','$$']] }};</script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  </head>
  <body>
  <div style="display:none" id="rawData">
${blockContent}  
  </div>
  <div class="container">
    <div class="row">
      <div class="col-lg-12 p-2">
          <div id="content"></div>
      </div>
    </div>
  </div>
    <script>    
      window.onload = function(){loadData()}
      const loadData = () => {
        let data = document.getElementById("rawData").innerHTML 
        const parsedData = marked.parse(data)
        document.getElementById("content").innerHTML = parsedData
      }
    </script>
  </body>
</html>`
      return htmlPage
    },
  }
  try {
    const docContent = await  docTypes[options.type]()
    return docContent
  } catch (error) {
    console.log("Error in processing doc content")
    console.warn(error.message)    
  }
}

module.exports.generateOutput = generateOutput