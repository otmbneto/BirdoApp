include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");
//aplica as mudancas nos nodes selecionados baseado nas selecoes da ui

function applyLineControl(self, initialData){

	var useLineControl = self.ui.checEnable.checked;
	var lineValueLabel = parseFloat(self.ui.gb_options.label_Value.text);
	var rig_read_nodes = self.ui.gb_node.radioRig.checked ? initialData["read_nodes"] : initialData["selected_nodes"];			
	var lineDefformation = self.ui.gb_options.checkDefLine.checked;
	var anim_over_time = self.ui.gb_options.checkBAnimLine.enabled && self.ui.gb_options.checkBAnimLine.checked; 

	//define a column criada para animar o lineedit do rig_read_nodes
	var line_column = "line_" + node.getName(initialData.rig_group);
	if(column.type(line_column) != "BEZIER"){
		column.add(line_column,"BEZIER");
	}
	
	if(anim_over_time){
		//limpa keys da coluna de linha
		cleanKEYSColumn(line_column);
		//update column keys
		var frames_values = getFramesValues(initialData.read_nodes, line_column, lineValueLabel);
		Print("anim frames values: ");
		Print(frames_values);
	}
	
	//update prgressBar
	self.clearProgressBar();
	self.ui.progressBar.setRange(0, rig_read_nodes.length);
	

	for(var i=0; i<rig_read_nodes.length; i++){

		self.updateProgressBar("node: " + rig_read_nodes[i]);

		//deslink de qualuqer funcao q esteja linkada no att multLineArtThickness
		node.unlinkAttr(rig_read_nodes[i], "multLineArtThickness");
		
		//update line value (if anim link column)
		if(anim_over_time){
			node.linkAttr(rig_read_nodes[i], "multLineArtThickness", line_column);			
		} else{
			//define se aplica o valor da linha somente se useLineControl for verdade!
			var value = useLineControl ? lineValueLabel : node.getTextAttr(rig_read_nodes[i], 1, "multLineArtThickness");
			node.setTextAttr(rig_read_nodes[i], "multLineArtThickness", 1, value);
		}
		
		//define se vai precisar acionar opcoes de defformation
		var changeDefformation = (has_defformation(rig_read_nodes[i]) && lineDefformation);
		var smoothVal = changeDefformation ? self.ui.gb_options.spinSmooth.value : parseFloat(node.getTextAttr(rig_read_nodes[i], 1, "PENCIL_LINE_DEFORMATION_SMOOTH"));
		var fixVal = changeDefformation ? self.ui.gb_options.doubleSpinFix.value : parseFloat(node.getTextAttr(rig_read_nodes[i], 1, "PENCIL_LINE_DEFORMATION_FIT_ERROR"));;
		var scale_style = self.ui.gb_options.comboScale.currentText;

		//SET Line control attributes
		node.setTextAttr(rig_read_nodes[i], "ADJUST_PENCIL_THICKNESS", 1, useLineControl);//ativa controle de linha
		node.setTextAttr(rig_read_nodes[i], "ZOOM_INDEPENDENT_LINE_ART_THICKNESS", 1, scale_style);//att obrigatorio (adapta a linha a scale e camera)
		
		//fix contant value to 0 to make sense
		node.setTextAttr(rig_read_nodes[i], "ADD_LINE_ART_THICKNESS", 1, 0);

		//SET Line Deform attributes
		node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_PRESERVE_THICKNESS", 1, changeDefformation);		
		node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_SMOOTH", 1, smoothVal);
		node.setTextAttr(rig_read_nodes[i], "PENCIL_LINE_DEFORMATION_FIT_ERROR", 1, fixVal);
		
	}
	self.updateProgressBar("EditLine Applyed with value: " + lineValueLabel);
	
	//EXTRA FUNCTIONS
	function has_defformation(nodeToCheck){//checks if this node has a defformation affecting the drawings
		var up_node = node.srcNode(nodeToCheck, 0);
		return node.isGroup(up_node) && is_def_group(up_node);
		function is_def_group(groupNode){
			var is_def = false;
			var subs = node.subNodes(groupNode);
			subs.forEach(function (element){
							if(node.type(element) == "TransformationSwitch" || node.type(element) == "CurveModule"){
								 is_def = true;
							}
						});
			return is_def;
		}
	}
	function cleanKEYSColumn(coluna){//Limpa os keys da coluna da line do personagem
		var count = 0;
		for(var i=1; i<= frame.numberOf(); i++){
			if(column.clearKeyFrame(coluna, i)){
				count++;
			}
		}
		Print("Clean Keys: " + coluna + "\n--------------------frames: " + count);
		return count;
	}
	//cria objeto com os valores da linha para cada frame
	function getFramesValues(nodesList, coluna, value){
		self.clearProgressBar();
		self.ui.progressBar.setRange(0, frame.numberOf());
		self.updateProgressBar(" - analizing frame: " + 1);
		var val_fr_um = getNodesLineValueForFrame(nodesList, 1, value);
		var frames_data = {"1": val_fr_um};
		column.setEntry(coluna, 1, 1, val_fr_um);
		if(frame.numberOf() < 2){
			return frames_data;
		}
		
		for(var i=2; i<=frame.numberOf(); i++){
			self.updateProgressBar(" - analizing frame: " + i);
			var lastValue = frames_data[Object.keys(frames_data)[Object.keys(frames_data).length-1]];
			var frame_value = getNodesLineValueForFrame(nodesList, i, value);
			if(lastValue == frame_value){
				continue;
			}
			frames_data[i] = frame_value;
			column.setEntry(coluna, 1, i, frame_value);
		}
		return frames_data;
	}
	//Caucula o valor final da linha em cada frame 
	function getNodesLineValueForFrame(nodesList, inFrame, value){
		var valor_frame = (BD2_getMedianScaleForNodes(nodesList, inFrame) + BD2_getCameraFrameValue(inFrame))/2;
		var valor_curr_frame = (BD2_getMedianScaleForNodes(nodesList, frame.current()) + BD2_getCameraFrameValue(frame.current()))/2;
		return (value * (valor_frame/valor_curr_frame)).toFixed(2);
	}
}

exports.applyLineControl = applyLineControl;
