(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const encode = require("./src/encode")
const decode = require("./src/decode")
const action = require("./src/actions")

module.exports = {
  encode : encode,
  decode : decode,
  action : action
}
},{"./src/actions":2,"./src/decode":3,"./src/encode":4}],2:[function(require,module,exports){
// code to perform actions on a document object and  maintain its validity

/**
 * valid actions 
 * get blank document 
 * add a new block in a document
 * relate one block with another 
 * edit block : modify text, modify edges
 * delete block 
 * add a new block and relate it to another block at the same time
 * validate documentObject
 */



module.exports = {
  
}
},{}],3:[function(require,module,exports){
// code to decode a document object to a text file
const decode = (documentObject,options={})=>{
  return "Text"
}
module.exports = decode
},{}],4:[function(require,module,exports){
// code to encode a text file to document object 

const graph  = require("./graph.js")


const encode = (document, options = {}) => {
  const DEV = false;

  const removeSpace = (text) => {
    let noSpaceText = text.trim().replaceAll(/ +/g, "-");
    noSpaceText = noSpaceText.toLowerCase();
    return noSpaceText;
  };

  const randomInteger = (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  const getParts = (text) => {
    let parts = text.split(".");
    let data = { blockId: "", subPart: "", subSubPart: "" };
    data.blockId = removeSpace(parts[0]);
    data.subPart = parts.length >= 2 ? removeSpace(parts[1]) : "";
    data.subSubPart = parts.length == 3 ? removeSpace(parts[2]) : "";
    return data;
  };

  const parseActionArguments = (argumentText) => {
    let result = { action: "", arguments: { text: "", d: "0" } };
    const parts = argumentText.split(":");
    result.action = parts[0].trim();
    if (parts.length > 1) {
      let argParts = parts[1].split(",");
      if (argParts.length > 0) {
        result.arguments["text"] = argParts[0].trim();
        argParts.shift();
        argParts.map((argu) => {
          let ar = argu.split("=");
          result.arguments[ar[0].trim()] = ar[1].trim();
        });
      }
    }
    return result;
  };

  const annotations = {
    declaration: {
      extract: (text) => {
        const reg = /^\.\[([\+]?)([\w\s\-]+?)([,]*?)([\w\s\-]+?)\]/gm;
        const parts = text.match(reg);
        if (parts) {
          let ann = {
            raw: parts[0],
            text: "",
            blockId: "",
            processed: false,
            dataType: "default",
            found: true,
            type: "declaration",
          };
          const theString = parts[0].replace(".[", "").replace("]", "").trim();
          ann.text = theString;
          let part1 = theString.split(",");
          ann.blockId = removeSpace(part1[0]);
          if (part1.length > 1) {
            ann.dataType = part1[1].trim();
          }
          return [ann];
        } else {
          return [];
        }
      },
    },
    append: {
      extract: (text) => {
        const reg = /^\+\[([\+]?)([\w\s\-]+?)\]/gm;
        const parts = text.match(reg);
        if (parts) {
          let ann = {
            type: "append",
            raw: parts[0],
            text: "",
            blockId: "",
            found: true,
            processed: false,
          };
          const theString = parts[0].replace("+[", "").replace("]", "").trim();
          ann.text = theString;
          ann.blockId = removeSpace(theString);
          return [ann];
        } else {
          return [];
        }
      },
    },
    invocation: {
      extract: (text) => {
        const reg = /\>\[([\w\s\-]+?)([\.]*)([\w\s\-]*)([\.]*)([\w\s\-]*)\]/gm;
        const parts = text.match(reg);
        if (parts) {
          let anns = [];
          parts.map((part) => {
            let ann = {
              type: "invocation",
              raw: part,
              text: "",
              blockId: "",
              subPart: "",
              subSubPart: "",
              found: true,
              processed: false,
            };
            const theString = part.replace(">[", "").replace("]", "").trim();
            ann.text = theString;
            let data = getParts(theString);
            ann = { ...ann, ...data };
            anns.push(ann);
          });
          return anns;
        } else {
          return [];
        }
      },
    },
    edge: {
      extract: (text) => {
        const reg = /\~\[([\w\s\-\,\.\*]+?)\]/gm;
        const parts = text.match(reg);
        if (parts) {
          let anns = [];
          parts.map((part) => {
            let ann = {
              type: "edge",
              raw: part,
              text: "",
              v1: "*",
              v2: "*",
              label: "",
              found: true,
              processed: false,
            };
            const theString = part.replace("~[", "").replace("]", "").trim();
            ann.text = theString;
            let part1 = theString.split(",");
            if (part1.length == 2) {
              ann.v2 = removeSpace(part1[1]);
              ann.label = removeSpace(part1[0]);
            } else if (part1.length == 3) {
              ann.v1 = removeSpace(part1[0]);
              ann.v2 = removeSpace(part1[2]);
              ann.label = part1[1];
            } else {
              throw new Error(
                `Invalid edge annotation : ${part}. Format :  or  or   (* for current block id)`
              );
            }
            anns.push(ann);
          });
          return anns;
        } else {
          return [];
        }
      },
    },
    action: {
      extract: (text) => {
        const reg = /\/\[([\s\w\:\,\=\%\.\_\-\/\>\<]+?)\]/gm;
        const parts = text.match(reg);
        if (parts) {
          let anns = [];
          parts.map((part) => {
            let ann = {
              type: "action",
              raw: part,
              text: "",
              action: "",
              arguments: {},
              found: true,
              processed: false,
            };
            const theString = part.replace("/[", "").replace("]", "").trim();
            ann.text = theString;
            let part1 = parseActionArguments(theString);
            ann = { ...ann, ...part1 };
            anns.push(ann);
          });
          return anns;
        } else {
          return [];
        }
      },
    },
  };

  const extractAllAnnotations = (text) => {
    let refText = text.trim();
    let annotationList = [];
    let annCount = {};
    const allAnnotations = Object.keys(annotations);
    allAnnotations.map((ann) => {
      let anns = annotations[ann].extract(text);
      annCount[ann] = anns.length;
      annotationList = [...annotationList, ...anns];
    });
    return { stats: annCount, annotations: annotationList };
  };

  const dataTypeUtils = {
    parseDefaultData: (blockText) => {
      let data = { title: blockText, noLines: 0, linesWithoutTitle: [] };
      let lines = blockText.split("\n");
      const noOfLines = lines.length;
      data.noLines = noOfLines;
      if (noOfLines > 1) {
        data.title = lines[0];
      }
      lines.shift();
      data.linesWithoutTitle = lines;
      return data;
    },
    stringToObject: (text) => {
      // string is of the form "title: text,  one = two , three = four, five = six"
      let parts1 = text.split(" : ");
      let obj = { key: parts1[0].trim(), value: {} };
      parts1.shift();
      let remaingString = parts1.join(" : ");
      let data = { text: remaingString };
      let fields = remaingString.split(",");
      fields.map((field, index) => {
        let v = field.split(" = ");
        if (v.length == 2) {
          data[v[0].trim()] = v[1].trim();
        } else if (index == 0) {
          data["text"] = field;
        }
      });
      obj.value = data;
      return obj;
    },
  };
  const dataType = {
    "key-value": (block, utils) => {
      let initialData = utils.parseDefaultData(block.text);
      let keyValueData = {};
      initialData.linesWithoutTitle.map((line) => {
        let l = line.trim();
        if (l.trim().length > 0 && l[0] == "-") {
          l = l.replace("-", "");
          const parsedString = utils.stringToObject(l);
          keyValueData[parsedString.key] = parsedString.value;
        }
      });
      initialData.keyValueData = keyValueData;
      initialData.type = "key-value";
      delete initialData.linesWithoutTitle;
      return initialData;
    },
    csv: (block, utils) => {
      let initialData = utils.parseDefaultData(block.text);
      let csvData = [];
      initialData.linesWithoutTitle.map((line) => {
        let l = line.trim();
        if (l.trim().length > 0 && l[0] == "-") {
          l = l.replace("-", "");
          const parts = l.split(",");
          csvData.push(parts);
        }
      });
      initialData.csvData = csvData;
      initialData.type = "csv";
      delete initialData.linesWithoutTitle;
      return initialData;
    },
    list: (block, utils) => {
      let initialData = utils.parseDefaultData(block.text);
      let listData = ["index item added by default"];
      initialData.linesWithoutTitle.map((line) => {
        let l = line.trim();
        if (l.trim().length > 0 && l[0] == "-") {
          l = l.replace("-", "");
          listData.push({ text: l });
        }
      });
      initialData.listData = listData;
      initialData.type = "list";
      delete initialData.linesWithoutTitle;
      return initialData;
    },
    "resource-list": (block, utils) => {
      let initialData = utils.parseDefaultData(block.text);
      let resourceData = {};
      initialData.linesWithoutTitle.map((line) => {
        let l = line.trim();
        if (l.trim().length > 0 && l[0] == "-") {
          l = l.replace("-", "");
          let parsedObj = utils.stringToObject(l);
          resourceData[parsedObj.key] = parsedObj.value;
        }
      });
      initialData.resourceListData = resourceData;
      initialData.type = "resource-list";
      delete initialData.linesWithoutTitle;
      return initialData;
    },
    default: (block, utils) => {
      let data = utils.parseDefaultData(block.text);
      data.type = "default";
      delete data.linesWithoutTitle;
      return data;
    },
  };

  let blocks = document.split("\n\n");

  let docObject = {
    valid: true,
    blocks: [],
    data: {},
    graphs: {},
    errors: [],
    warnings: [],
    metadata: {},
    extra: {},
  };

  docObject.graphs.deps = graph.createGraph({
    isSimple: true,
    hasLoops: false,
    hasDirectedEdges: true,
    title: "Invocation block dependency graph",
  });
  docObject.graphs.knowledge = graph.createGraph({
    hasLoops: false,
    isSimple: true,
    hasDirectedEdges: true,
    title: "Knowledge graph",
  });

  const docError = (data) => {
    docObject.valid = false;
    docObject.errors.push(data);
  };
  const docWarn = (data) => {
    docObject.warnings.push(data);
  };

  try {
    blocks.map((block, blockIndex) => {
      if (block.trim() == "") {
        docWarn({
          text: `Blank block at position ${blockIndex + 1}`,
          blockIndex: blockIndex,
        });
      }

      let ann = extractAllAnnotations(block);

      let newBlockData = {
        blockId: "",
        text: "",
        source: { raw: [], first: "", second: "" },
        dataType: "default",
        value: {},
        annotations: [],
        process: [],
      };
      let blockData;
      if (ann.stats.declaration == 1) {
        let dec = ann.annotations.find((itm) => {
          return itm.type == "declaration";
        });
        if (docObject.data[dec.blockId]) {
          throw new Error(
            `Redeclaration of ${dec.blockId} is invalid. Use append instead`
          );
        }
        let newText = block.replace(dec.raw, "");
        blockData = {
          ...newBlockData,
          blockId: dec.blockId,
          dataType: dec.dataType,
          text: newText,
          source: { raw: [block], first: block, second: "" },
          annotations: ann.annotations,
          process: ["initialized"],
        };
        blockData.process.push("block id declared");
        docObject.blocks.push(dec.blockId);
        docObject.data[dec.blockId] = blockData;
      } else if (ann.stats.append == 0) {
        // define a new block
        let randomBlockName = randomInteger(1000, 9999);
        blockData = {
          ...newBlockData,
          blockId: randomBlockName,
          text: block,
          source: { raw: [block], first: block, second: "" },
          annotations: ann.annotations,
          process: ["initialized"],
        };
        blockData.process.push("random block id assigned");
        docObject.blocks.push(randomBlockName);
        docObject.data[randomBlockName] = blockData;
      }
      try {
        docObject.graphs.deps = graph.addVertex(docObject.graphs.deps, {
          id: blockData.blockId,
        });
      } catch (error) {
        if (DEV) {
          console.log(error);
        }
      }

      if (ann.stats.append == 1) {
        let act = ann.annotations.find((itm) => {
          return itm.type == "append";
        });
        let blockFound = docObject.blocks.indexOf(act.blockId) > -1;
        if (blockFound) {
          blockData = docObject.data[act.blockId];
          let newText = block.replace(act.raw, "");
          blockData.text = blockData.text + "\n" + newText;
          blockData.source.first = blockData.source.first + "\n" + block;
          blockData.source.raw.push(block);
          blockData.annotations = [
            ...blockData.annotations,
            ...ann.annotations,
          ];
          blockData.process.push("text appened");
        } else {
          throw new Error(
            `the append annotation on block ${act.blockId} is not valid at this block does not exist.`
          );
        }
      }

      if (ann.stats.invocation > 0) {
        let allInv = ann.annotations.filter((itm) => {
          return itm.type == "invocation";
        });
        allInv.map((inv) => {
          if (inv.blockId == blockData.blockId) {
            throw new Error(`Invalid invocation : ${inv.raw}`);
          }
          try {
            docObject.graphs.deps = graph.addVertex(docObject.graphs.deps, {
              id: inv.blockId,
            });
          } catch (error) {
            if (DEV) {
              console.log(error);
            }
          }
          docObject.graphs.deps = graph.addEdge(docObject.graphs.deps, {
            v1: blockData.blockId,
            v2: inv.blockId,
          });
          docObject.data[blockData.blockId].process.push(
            `inv ann: ${inv.raw} , edge in dep graph`
          );
        });
      }

      const allEdges = ann.annotations.filter((itm) => {
        return itm.type == "edge";
      });
      allEdges.map((ed) => {
        let v1 = ed.v1 != "*" ? ed.v1 : blockData.blockId;
        let v2 = ed.v2 != "*" ? ed.v2 : blockData.blockId;
        if (v1 == v2) {
          throw new Error(`Invalid edge annotation ${ed.raw} `);
        }
        try {
          docObject.graphs.knowledge = graph.addVertex(
            docObject.graphs.knowledge,
            { id: v1 }
          );
        } catch (er) {
          if (DEV) {
            console.log(er);
          }
        }
        try {
          docObject.graphs.knowledge = graph.addVertex(
            docObject.graphs.knowledge,
            { id: v2 }
          );
        } catch (er) {
          if (DEV) {
            console.log(er);
          }
        }
        docObject.graphs.knowledge = graph.addEdge(docObject.graphs.knowledge, {
          v1: v1,
          v2: v2,
          label: ed.label,
        });
        let newText = docObject["data"][blockData.blockId].text.replace(
          ed.raw,
          ""
        );
        docObject["data"][blockData.blockId].text = newText;
        docObject["data"][blockData.blockId].process.push(
          `edge-annotation: ${ed.text} processed`
        );
      });
    });
  } catch (error) {
    if (DEV) {
      console.log(error);
    }
    docError({
      text: `${error.message}`,
      details: "Error occurred during the first pass ",
    });
    return docObject;
  }

  try {
    let order = graph.TopologicalSort(docObject.graphs.deps);
    docObject.extra.blockOrder = order.vertexInOrder;
    docObject.graphs.dfsTree = order.dfsTree;
    docObject.graphs.tsTree = order.tsTree;
  } catch (error) {
    if (DEV) {
      console.log(error);
    }
    docError({
      text: `${error.message}`,
      details: "Error occured during dependency check ",
    });
    return docObject;
  }

  try {
    docObject.extra.blockOrder.map((block) => {
      const blockId = block.vertexId;
      if (!docObject.data[blockId]) {
        throw new Error(
          `invocation error : the block "${blockId}" does not exists in the doc`
        );
      }
      let blockContent = docObject.data[blockId];

      let invAnn = docObject.data[blockId].annotations.filter((itm) => {
        return itm["type"] == "invocation";
      });
      invAnn.map((inv) => {
        let mainText = blockContent.text;
        if (!docObject.data[inv.blockId]) {
          throw new Error(
            `invalid invocation ${inv.raw}, the block '${inv.blockId}' does not exists in the doc`
          );
        }
        let targetText = docObject.data[inv.blockId].text;
        mainText = mainText.replaceAll(inv.raw, targetText);
        blockContent.text = mainText;
        blockContent.process.push(`inv ${inv.raw} replaced`);
      });

      let actAnn = docObject.data[blockId].annotations.filter((itm) => {
        return itm.type == "action";
      });
      actAnn.map((act) => {
        let mainText = blockContent.text;
        blockContent.text = mainText.replace(act.raw, "");
        blockContent.process.push(`action ann: replaced ${act.raw}`);
      });

      let dt = { ...dataType };
      let dtu = { ...dataTypeUtils };
      let dataValue = dt[blockContent.dataType](blockContent, dtu);
      blockContent.value = dataValue;
      blockContent.process.push("datatype processed");
    });
  } catch (error) {
    if (DEV) {
      console.log(error);
    }
    docError({
      text: `${error.message}`,
      details: "Error occurred during second pass ",
    });
    return docObject;
  }
  return docObject;
};

module.exports = encode;

},{"./graph.js":5}],5:[function(require,module,exports){
/*** 
the Graph program. Version 1.2.2 . 
Full source code is available at https://github.com/shubhvjain/graphs
Copyright (C) 2022  Shubh

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/> 

***/

 
const createGraph = (options = {}) => {
  const initialMetadata = { 
    title: options.title || "Graph " ,
    hasLoops: options.hasLoops || false,
    hasEdgeWeights: options.hasLoops || false,
    hasDirectedEdges: options.hasDirectedEdges || false,
    isSimple: options.isSimple || true
  }
  const initialOptions = {
    defaultNewEdgeLabel: options.defaultNewEdgeLabel || "" ,
    defaultNewVertexLabel:options.defaultNewVertexLabel || "", 
    defaultNewVertexWeight:options.defaultNewVertexWeight || "", 
    defaultNewEdgeWeight:options.defaultNewEdgeWeight || "",
    addBlankVertex: options.addBlankVertex|| true 
  }
  const theGraph = {
    vertices: {},
    edges: [],
    metadata: initialMetadata,
    options: initialOptions
  }
  return theGraph
} 


const addVertex = (graphData,options) =>{
  if(!options.id){
    if(!graphData.options.addBlankVertex){
      throw new Error ("No vertex id provided")
    }else{
      options.id = Math.floor(Math.random() * (50000) +1)
    }
  }
  if(graphData.vertices[options.id]){
    throw new Error("Vertex with same id already exists in the graph.")
  }
  graphData.vertices[options.id] = {
    label: options.label || options.id ,
    weight: 'weight' in options ? options.weight : graphData.options.defaultNewVertexWeight,
    data: options.data,
    temp: {...options.temp}
  }
  return graphData
  
}


const addEdge = (graphData,options)=>{

  if(!options.v1){throw new Error("Vertex 1 not provided")}
  if(!options.v2){throw new Error("Vertex 2 not provided")}
  
  if(!graphData.vertices[options.v1]){throw new Error(`Vertex 1 (${options.v1}) does not exists in the graph`)}
  if(!graphData.vertices[options.v2]){throw new Error(`Vertex 2 (${options.v2})  does not exists in the graph`)}

  const node1node2Search = graphData.edges.find(edge=>{return edge.v1 == options.v1 &&  edge.v2 == options.v2})
  const node2node1Search = graphData.edges.find(edge=>{return edge.v1 == options.v2 &&  edge.v2 == options.v1}) 

  if(graphData.metadata.isSimple){
    if(node1node2Search || node2node1Search ){ throw new Error(`Edge ${options.v1}--${options.v2} already exists in the simple graph`)}
  }

  let newEdge = {
    v1: options.v1,
    v2: options.v2, 
    weight:options.weight|| graphData.options.defaultNewEdgeWeight,
    label:options.label || graphData.options.defaultNewEdgeLabel,
    temp: {...options.temp}
  }

  graphData.edges.push(newEdge)

  return graphData

}


const getVertexNeighbours = (graphData,vertexId)=>{
  if(!vertexId){throw new Error("No Vertex Id not provided")}
  if(!graphData.vertices[vertexId]){throw new Error("Vertex not found in the graph")}

  const node1Search = graphData.edges.filter(edge=>edge.v1 == vertexId)
  const node2Search = graphData.edges.filter(edge=>edge.v2 == vertexId) 

  let neighbours = { in:[], out:[], all:[]}

  node1Search.map(edge2=>{ 
    if(neighbours.all.indexOf(edge2.v2)==-1){   
      neighbours.all.push(edge2.v2)
      neighbours.out.push(edge2.v2)
    }
  })
  node2Search.map(edge1=>{ 
    if(neighbours.all.indexOf(edge1.v1)==-1){   
      neighbours.all.push(edge1.v1)
      neighbours.in.push(edge1.v1)
    }
  })
  if(graphData.metadata.hasDirectedEdges){
      return neighbours.out
  }else{
      return neighbours.all
  }

}


const getVertexDegree = (graphData,vertexId)=>{
  const neighbours = getVertexNeighbours(graphData,vertexId)
  return  neighbours.length 
}


const getVertexKeyMap = (graphData,options={vertexProperties:[],initialObjectValue:{}})=>{
  let keyMap = {}
  const allKeys = Object.keys(graphData.vertices)
  vertexProps = {
    'degree':(vertexId)=>{
      return getVertexDegree(graphData,vertexId)
    }
  }
  allKeys.map(ky=>{
     keyMap[ky] =  {...options.initialObjectValue}
     options.vertexProperties.map(prop=>{
        keyMap[ky][prop] = vertexProps[prop](ky)
     })
  })
  return keyMap
}


const printEdges = (graphData)=>{
  graphData.edges.map(edge=>{
    console.log(` ${edge.v1}  ---  ${edge.v2} `)
  })
}


// const fs = require("fs/promises");
const generateGraphPreview = async (graphs,options)=>{
  // const saveSomethingInSomefile = async(fileContent,filePath) =>{
  //     await fs.writeFile(filePath, fileContent);
  // }
  const generateHTMLBodyForGraphs = (inputGraphs) =>{
    let graphHtml = ""
    inputGraphs.map((graph,index)=>{
        let vertexInVisFormat = []
        const vertex = Object.keys(graph.vertices)
        vertex.map((v,inx)=>{
          let label = `${options.showVertexCreatedOrder?"("+inx+")     ":""}${graph['vertices'][v]['label']|| v}  `
          vertexInVisFormat.push( { id:v , label: label  } )
          })
        let edgesInVisFormat = []
        graph.edges.map(e=>{
          let newEdge = { from : e.v1, to: e.v2, color: e.temp['color']  }
          if(e.label){newEdge['label'] = e['label']}
          edgesInVisFormat.push(newEdge)
        })
        let visOptions = {
          "nodes":{"shape":"box"}
        }
        if(graph.metadata.hasDirectedEdges){visOptions['edges'] = { arrows: 'to'}}
        const dataForViz = {nodes : vertexInVisFormat,edges:  edgesInVisFormat,options: visOptions}
        graphHtml += `
            <h2> #${index+1}. ${graph.metadata.title}</h2>
            <div class="graph" id="graph${index}"></div>
            <details><summary>GraphData</summary><pre>${JSON.stringify(graph,null,2)}</pre></details>
            <script>
              let dataForViz${index} = ${JSON.stringify(dataForViz)}
              const container${index} = document.getElementById('graph${index}')
              const data${index} = {
                nodes: new vis.DataSet(dataForViz${index}.nodes),
                edges: new vis.DataSet(dataForViz${index}.edges)
              }
              let network${index} = new vis.Network(container${index}, data${index}, ${JSON.stringify(dataForViz['options'])});
            </script>`
      })
      return graphHtml
  }

  const formats = {
    'html':async ()=>{
      if(!options.outputPath){throw new Error("Path for output file not provided") }
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      const htmlTemplate = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script><title>Graphs</title></head>
      <body><style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}</body></html>`
      //await saveSomethingInSomefile(htmlTemplate,options.outputPath)
      return {"message": "Saved",htmlTemplate: htmlTemplate}
    },
    'htmlParts':async ()=>{
      let graphHtml =  generateHTMLBodyForGraphs(graphs)
      let htmlParts = {
        head:` <script type="text/javascript" src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>`,
        body: `<style>.graph {width: 90%; height: 80vh; border: 1px solid #80808036;}</style>${graphHtml}`
      }
      return htmlParts
    }
  }
  if(!options.format){throw new Error("Specify a format. Available foramts: "+Object.keys(formats))}
  try{
    const response = await formats[options.format]()
    return response
  }catch(error){console.log(error)}
}


const BreadthFirstSearch = (graphData,sourceVertexId)=>{
  if(!graphData.vertices[sourceVertexId]){throw new Error("Source vertex not found")}
  
  let graphCopy = JSON.parse(JSON.stringify(graphData))
  graphCopy.vertices[sourceVertexId].temp = {visited: true}

  let theTree = createGraph({title:`BFS tree starting with node ${sourceVertexId}`})
  theTree = addVertex(theTree,{id:sourceVertexId,weight:0})

  let queue = []
  queue.push(sourceVertexId)
  
  while(queue.length > 0){
      const aNode =  queue.shift()
      const sourceNeighbours = getVertexNeighbours(graphCopy,aNode)
      sourceNeighbours.map(neighbour=>{
        const alreadyVisited = 'visited'  in  graphCopy.vertices[neighbour]['temp']
        if(!alreadyVisited){
          queue.push(neighbour)
          predcessorWeight = theTree.vertices[aNode]['weight']
          theTree = addVertex(theTree,{id:neighbour,weight:predcessorWeight+1})
          theTree = addEdge(theTree,{v1:aNode,v2:neighbour})
          graphCopy.vertices[neighbour]['temp']['visited'] = true
        }
      })
  }
  return theTree
}


const DepthFirstSearch = (graphData)=>{
  let visited = getVertexKeyMap(graphData,{vertexProperties:["degree"], initialObjectValue :{color:'white', pi: null, d: 0, f:0}})
  //let allVertices = []
  //Object.keys(visited).map(itm=>{allVertices.push({vertex: itm,degree: visited[itm]['degree']})})
  //allVertices = allVertices.sort((a,b)=>{return b.degree - a.degree})
  let time = 0
  let otherEdges = []
  const DFS = () =>{
    Object.keys(graphData.vertices).map(vertex =>{
      if (visited[vertex]['color']=='white'){
        DFS_VISIT(vertex)
      }
    })
  }
  const DFS_VISIT = (u) =>{
    time = time +1 
    visited[u]['d'] = time
    visited[u]['color'] = 'grey'
    const neighbours = getVertexNeighbours(graphData,u) 
    neighbours.map(neighbour=>{
      if (visited[neighbour].color=='white'){
          visited[neighbour]['pi'] = u
          DFS_VISIT(neighbour)
        }else{
          let eType = visited[neighbour]['color']=="grey" ? "backward-edge":  "cross-edge"
          otherEdges.push({
            v1: u,
            v2: neighbour,
            label: eType ,
            temp: {color: eType=="backward-edge" ? "red" : "violet"  }
          })
        }
      })
      visited[u]['color'] = 'black'
      time = time + 1
      visited[u]['f'] = time 
  }
  DFS()
  let theDFSGraph = createGraph({title:`DFS Forest`, hasDirectedEdges: true})
  Object.keys(graphData.vertices).map(v=>{
    theDFSGraph = addVertex(theDFSGraph,
      {
        id:v, 
        label: `${v} (d=${visited[v]['d']},f=${visited[v]['f']})` ,
        temp: visited[v]
      })
  })
  Object.keys(visited).map(ver=>{ 
    if(visited[ver]['pi']){
      theDFSGraph = addEdge(theDFSGraph,{v1: visited[ver]['pi'] , v2: ver, label:"tree-edge", temp: {color:'green'}})
    }
  })
  otherEdges.map(edg=>{
      theDFSGraph = addEdge(theDFSGraph,edg)
  })
  return theDFSGraph
}


const CheckForCyclesInGraph = (graphData) => {
  const DFSTree = DepthFirstSearch(graphData)
  const backEdges = DFSTree.edges.filter(edge=>{return edge.label=='backward-edge'})
  return { cycleExists : backEdges.length > 0   , edges: backEdges, dfsTree : DFSTree }
}


const TopologicalSort = (graphData)=>{
  const cycleCheck = CheckForCyclesInGraph(graphData)
  if(cycleCheck.cycleExists){
    throw new Error("This graph has cycles. Topological sort not possible")
  }
  let tSortedGraph = createGraph({title:`Topological sorting`, hasDirectedEdges: true})
  tSortedGraph.vertices  =  JSON.parse(JSON.stringify(cycleCheck.dfsTree.vertices))
  let vertexOrder = []
  Object.keys(cycleCheck.dfsTree.vertices).map(v=>{
    vertexOrder.push({vertexId:v,fVal : cycleCheck.dfsTree.vertices[v]['temp']['f'] })
  })
  vertexOrder = vertexOrder.sort((a,b)=>{ return a.fVal - b.fVal })
  
  for(let i = 0; i <= vertexOrder.length - 2  ; i++ ){
    tSortedGraph = addEdge(tSortedGraph,{v1:vertexOrder[i]['vertexId'] , v2: vertexOrder[i+1]['vertexId'] })
  }
  return  { vertexInOrder : vertexOrder, dfsTree : cycleCheck.dfsTree  , tsTree: tSortedGraph  }
}


module.exports = {
  createGraph,
  addVertex,
  addEdge,
  getVertexNeighbours,
  getVertexDegree,
  getVertexKeyMap,
  printEdges,
  generateGraphPreview,
  BreadthFirstSearch,
  DepthFirstSearch,
  CheckForCyclesInGraph,
  TopologicalSort
}

},{}]},{},[1]);
