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
