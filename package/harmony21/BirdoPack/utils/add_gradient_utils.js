include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
/*
-------------------------------------------------------------------------------
Name:		add_gradient_utils.js

Description:	utils do add gradient ao rig da comp

Usage:		usado na comp para adicionar um gradient de efeito com cutter no rig (utils de funcoes)

Author:		Leonardo Bazilio Bentolila

Created:	agosto, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------

	TODO: Adicionar Progress bar na funcao getTimelineRectPosition()


*/


//cria objeto com info de posicao (rect) para cada frame
function getTimelineRectPosition(read_list, draw_util){
	var timeline_data = {
		is_valid: false,
		rect_list: []	
	}
	//frame 1 rect 
	var rect1 = getRigCordinatesSelection(read_list, 1, draw_util);
	if(Boolean(rect1)){
		timeline_data["is_valid"] = true;
		timeline_data["rect_list"].push(rect1);		
	}
	//loop in frames
	for(var i=2; i<=frame.numberOf(); i++){
		var rect = getRigCordinatesSelection(read_list, i, draw_util);
		if(!rect){
			continue;
		} else {
			timeline_data["is_valid"] = true;	
		}
		var lastRect = timeline_data.rect_list[timeline_data.rect_list.length-1];
		if(Boolean(lastRect) && !rect.isEqual(lastRect)){
			timeline_data["rect_list"].push(rect);		
		}
	}
	return timeline_data;	
}
exports.getTimelineRectPosition = getTimelineRectPosition;

//create patch fx with gradient and cutter
function addPatchFX(selectedNode){
	//add nodes
	var fx_group = node.add(node.root(), "FX_Grad","GROUP", 0, 0, 1);
	var multiIn = node.getGroupInputModule(fx_group, "Multi-Port-In", 0, -124, 1);
	var multiOut = node.getGroupOutputModule(fx_group, "Multi-Port-Out", 0, 156, 1);
	var grad = node.add(fx_group, "Grad", "GRADIENT-PLUGIN", -53, -24, 1);	
	var cutter = node.add(fx_group, "Cutter", "CUTTER", 18, 48, 2);

	//link sub nodes
	node.link(grad, 0, cutter, 1);
	node.link(multiIn, 0, cutter, 0, true, false);
	node.link(multiIn, 1, grad, 0, true, false);
	node.link(cutter, 0, multiOut, 0, false, true);
	
	//connect fx group
	BD2_ConnectNodeUnder(selectedNode, fx_group);
	
	return grad;
}
exports.addPatchFX = addPatchFX;

//aplica informacao de transformacao em todos frames da timeline_data
function applyTransformToGradPoints(transform_data, grad_node){
	
	transform_data.rect_list.forEach(function(item){
		applyValuesToGradientAtFrame(item, item.frame, grad_node);
	});
	Print("Applyed tranformation to : " + transform_data.rect_list.length + " frames in the gradiente node!");
}
exports.applyTransformToGradPoints = applyTransformToGradPoints;



//aplicao os valores do rect de selecao ao node gradient no FRAME
function applyValuesToGradientAtFrame(rect, frame, grad){
	var att0X = node.getAttr(grad, frame, "0.X");
	var att0Y = node.getAttr(grad, frame, "0.Y");

	var att1X = node.getAttr(grad, frame, "1.X");
	var att1Y = node.getAttr(grad, frame, "1.Y");

	att0X.setValue(rect.center().x);
	att1X.setValue(rect.center().x);
	
	att0Y.setValue(rect.top());
	att1Y.setValue(rect.bottom());
}

//retorna rect de selecao do todos nodes do rig (ou node read) selecionado no frame
function getRigCordinatesSelection(read_list, atframe, draw_util){

	var rect = null;
	read_list.forEach(function(item){
		var node_rect = generateDrawingRectPosition(item, atframe, draw_util);
		if(!rect){
			rect = node_rect; 
			return;
		}
		if(node_rect){
			rect.unite(node_rect);
		}
	});
	rect["frame"] = atframe;
	return rect;
}

//cria rect do node individual no frame
function generateDrawingRectPosition(node_path, atframe, draw_util){
	
	var general_matrix = node.getMatrix(sel, atframe).multiply(scene.getCameraMatrix(atframe));
	var box = getNodeBox(node_path, atframe);
	if(!box){
		Print("No drawing box found in node: " + node_path);
		return false;
	}
	var dRect = new draw_util.RectObject(box);
	dRect.toFields();
	
	dRect.multiplyMatrix(general_matrix);
	return dRect;
}

function getNodeBox(node_path, atframe){
	var currentDrawing = Drawing.Key({node : node_path, frame : atframe});
	var config = {
		drawing  : currentDrawing
	};
	var data = Drawing.query.getData(config); 
	var box = data.box;
	if(!box || box.hasOwnProperty("empty")){
		return false;
	}
	return box;
}