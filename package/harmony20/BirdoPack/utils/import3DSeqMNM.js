include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
	funcao pra require do script import 3d sequence do projeto MNM
*/	

function import3DSeqMNM(self, assets_data){
	
	scene.beginUndoRedoAccum("Import Assets 3D");	
	var nodes_created = [];
	var progressDlg = new QProgressDialog(self);
	//progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, 2);
	progressDlg.activateWindow();

	for(asset in assets_data){
		progressDlg.setLabelText("..Creating Group");
		var asset_group = createAssetGroup(asset);

		if(!asset_group){
			MessageBox.warning("ERROR creating node group!",0,0);
			return false;
		}
		//cria os nodes de tiff
		progressDlg.reset();
		progressDlg.setRange(0, assets_data[asset].length);

		assets_data[asset].forEach(function(item, index){
			progressDlg.setLabelText("importing Layer: " + item.imput_name);
			progressDlg.setValue(index);
			
			if(!item.valid){
				Print("Ignoring layer: " + item.imput_name);
				return;
			}
			var tif_node = addImageSeqIntoNode(item.imput_name, asset_group.node_path, item.file_list);
			if(!tif_node){
				Print("ERROR creating layer");
				continue;
			}
			nodes_created.push(tif_node);
		});
		Print("Nodes created:");
		Print(nodes_created);

		//organize nodes created
		connectNodes(nodes_created, asset_group.comp, asset_group.imput_module);

		//add peg to main group
		BD2_AddNodeUp(asset_group.node_path, node.getName(asset_group.node_path) + "-P", "PEG", false);
	}
	
	
	scene.endUndoRedoAccum();
	progressDlg.close();
	
	MessageBox.information("DONE! " + nodes_created.length + " nodes created!");
	return true;
	
	//extra functions
	function createAssetGroup(group_name){//cria o grupo com composite
		var parentGroup = node.root();
		var charcomp = "Top/CHAR";

		//search CHAR comp
		if(!node.getName(charcomp)){
			charcomp = node.srcNode("Top/SETUP", 2);
		}
		//add main group
		var group = node.add(parentGroup, group_name, "GROUP", 1026, -500, 0);
		if(!group){
			Print("ERROR creating group!");
			return false;
		}
		var inputModule = node.getGroupInputModule(group, "", 0, -500, 0);
		var outputModule = node.getGroupOutputModule(group, "", 0, 100, 0);
		var comp = node.add(group, "Composite", "COMPOSITE", 0, 0, 0);
		//set atts
		node.setTextAttr(comp, "COMPOSITE_MODE", 1, "Pass Through");
		//connection output
		node.link(comp, 0, outputModule, 0, false, true);
		if(charcomp){
			node.link(group, 0, charcomp, 0, false, true);
		}
		return {"node_path": group, "imput_module": inputModule, "output_module": outputModule, "comp": comp};
	}
	
	function connectNodes(node_list, comp, multiPortIn){//conecta a lista de nodes na comp
		var separator = 30;
		var length_all = separator * (node_list.length -1);
		node_list.forEach(function(n){
			length_all += node.width(n);
		});
		var comp_coord = getRectCoord(comp);
		var lineY = comp_coord.y() - 200;
		//values 
		var mid_point = comp_coord.center();
		var start_point = new QPoint();
		start_point.setX(parseInt(mid_point.x() - (length_all/2), 10));
		start_point.setY(mid_point.y() - 200);
		node_list.forEach(function(n, index){
			node.setCoord(n, start_point.x(), start_point.y());
			start_point.setX(start_point.x() + (node.width(n) + separator));
			//add peg
			var peg = BD2_AddNodeUp(n, node.getName(n) + "-P", "PEG", false);
			node.link(multiPortIn, 0, peg, 0, index == 0, false);
			node.link(n, 0, comp, 0, false, true);
		});
		return true;
	}

	function getRectCoord(nodePath){//cria QRect com as coordenadas do node na nodeview
		return new QRect(node.coordX(nodePath), node.coordY(nodePath), node.width(nodePath), node.height(nodePath));
	}
	
	function addImageSeqIntoNode(node_name, parent, images){//cria o node com as sequencias de tif
		
		var elemId = element.add(node_name, "COLOR", scene.numberOfUnitsZ(), "TIFF", null);
		if(elemId == -1){
			Print("falha ao criar elemento!");
			return null; // no read to add.
		}
		
		var uniqueColumnName = BD2_getUniqueColumnName(node_name);
		column.add(uniqueColumnName , "DRAWING");
		column.setElementIdOfDrawing( uniqueColumnName, elemId );

		var read = node.add(parent, node_name, "READ", 0, 0, 0);
		//config node att
		node.setTextAttr(read, "canAnimate", 1, false);
		node.setTextAttr(read, "APPLY_MATTE_TO_COLOR", 1, "Straight");
		node.setTextAttr(read, "alignmentRule", 1, "Center Fit");
		node.linkAttr(read, "DRAWING.ELEMENT", uniqueColumnName);
		
		//import images
		images.forEach(function(element){
			var timing = getImageFrame(element);
			Drawing.create(elemId, timing, true, false); // create a drawing drawing, 'true' indicate that the file exists, the last false indicates the drawing is in temp.
			var drawingFilePath = Drawing.filename(elemId, timing);   // get the actual path, in tmp folder.
			BD1_CopyFile(element, drawingFilePath);
			column.setEntry(uniqueColumnName, 1, parseFloat(timing), timing);
		});
		return read;
	}
	
	//retorna o numero do frame baseado no nome do arquivo de imagem
	function getImageFrame(imageName){
		var regex = /\.\d{4}\.\w{3}$/;
		return parseInt(imageName.match(regex)[0].slice(1,5), 10);
	}
	
}

exports.import3DSeqMNM = import3DSeqMNM;
