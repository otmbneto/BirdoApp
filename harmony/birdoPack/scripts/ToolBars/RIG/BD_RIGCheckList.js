include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

/*
-------------------------------------------------------------------------------
Name:		BD_RIGCheckList.js

Description:	Este Script roda uma serie de funcoes para fechar o turn do rig:
		 - Cria key frame pra toda coluna;
		 - Troca exposição vazia pra Zzero;
		 - Renomeia numeros pro padrao do rig; 	
		 - Cria keyframe de drawing;
		 
Usage:		Selecione a MASTER do RIG com o turn completo na timeline;

Author:		Leonardo Bazilio Bentolila

Created:	Abril, 2023;
            
Copyright:   leobazao_@Birdo
 
-------------------------------------------------------------------------------
*/

function BD_RIGCheckList(){
	Print(">>RI CHECKLIST start...");
	if(selection.selectedNode(0) == ""){
		MessageBox.information("Selecione a MASTER do RIG minimizada na Timeline, do primeiro ao ultimo frame do TURN!");
		return;
	}
	var counter_empty = 0;
	var counter_rename = 0;
	var counter = 0;
	var firstFrame = Timeline.firstFrameSel;
	var endFrame = firstFrame + Timeline.numFrameSel - 1;
	var numSelLayers = Timeline.numLayerSel;
	var fullNode_list = [];
	
	if(firstFrame != 1){
		if(!BD2_AskQuestion("Estranho, a seleção na Timeline não está começando no primeiro frame. Deseja continuar?")){
			return;
		}
	}
	
	//lista de prefixos (pega o alfabeto em caps);
	var prefix_list = BD2_all_chars.slice(26, 52);

	//ignorar os tipos de columns:
	var ignore_list = ["SOUND", "EXPR"];
	
	var options = get_options();
	if(!options){
		Print("Canceled..");
		return;
	}
	
	
	scene.beginUndoRedoAccum("Close Rig Turn");
	
	var progressDlg = new QProgressDialog();
	progressDlg.setStyleSheet(progressDlg_style);
	progressDlg.modal = true;
	progressDlg.open();
	progressDlg.setRange(0, (numSelLayers - 1));

	progressDlg.setLabelText("Analizando... ");

	for(var i=0; i<numSelLayers; i++){
		progressDlg.setValue(i);
		if(progressDlg.wasCanceled){
			MessageBox.information("Cancelado!");
			scene.cancelUndoRedoAccum();
			return;
		}
	
		if(!Timeline.selIsColumn(i)){
			continue;
		}
		//convert layers to column and node
		var col = Timeline.selToColumn(i);
		var colName = column.getDisplayName(col);
		var col_type = column.type(col);
		var node_path = Timeline.selToNode(i);
		var node_type = node.type(node_path);
		
		//Verifica se precisa continuar
		if(node_type == "READ"){
			//check FULL node
			if(node.getName(node_path).indexOf("FULL") != -1 && fullNode_list.indexOf(node_path) == -1 && options.check_full){
				Print("Full node found>> " + node_path);
				fullNode_list.push(node_path);
				check_full_node(node_path);
			}
			//se node do drawing nao permitir animaçao, somente continua se for coluna de DRAWING
			if(!node.getAttr(node_path, 1, "CAN_ANIMATE").boolValue() && col_type != "DRAWING"){
				continue;					
			}
		}
		if(ignore_list.indexOf(col_type) != -1){
			continue;	
		}

		if(modify_layers_frames(col, col_type, colName, node_path)){
			counter++;	
		}

		progressDlg.setLabelText("Analizando...\n" + colName);			

	}
	
	Print("FULL nodes found: ");
	Print(fullNode_list);
	
	progressDlg.close();
	scene.endUndoRedoAccum();
	
	MessageBox.information("Rig Checklist DONE! " + counter + 
	" camadas foram alteradas:\n - to Zzeo: " + counter_empty +
	";\n - renamed: " + counter_rename + 
	";\n - Created Drawings keyframes: " + options.d_key + 
	";\n - Created Transformation keyframes: " + options.c_key +
	";\n - Full nodes Checked: " + fullNode_list.length + ";");
	Print("<<End RIG CHECKLIST>>");
	
	//HELPER FUNCTIONS
	function check_full_node(full_node){//acerta pivot do full node para ficar na peg e seta pivot da peg pra 0,0
		var fullPeg = node.srcNode(full_node, 0);
		Print(node.setTextAttr(full_node, "USE_DRAWING_PIVOT", 1, "Apply Embedded Pivot on Parent Peg"));
		if(node.type(fullPeg) != "PEG"){
			Print("--no FULL peg found for node full--");
			return;
		}
		node.setTextAttr(fullPeg, "PIVOT.X", 1, 0);
		node.setTextAttr(fullPeg, "PIVOT.Y", 1, 0);
	}
	
	function rename_drawing_deform(node_path, old_name, new_name){
		var nextnode = node.srcNode(node_path, 0);
		if(node.isGroup(nextnode)){
			var switchnodes = node.subNodes(nextnode).filter(function(item){ return node.type(item) == "TransformationSwitch"});
			switchnodes.forEach(function(item){
				var d_list = [];
				var att = node.getTextAttr(item, 1, "transformationnames.transformation1");
				var drawings = att.split(";");
				drawings.forEach(function(d){ 
					if(d == old_name){
						d_list.push(new_name);
						Print("node Transformation Switch deformer drawing was renamed: " + node_path);
					} else {
						d_list.push(d);
					}
				});
				var new_att_val = d_list.join(";");
				node.setTextAttr(item, "transformationnames.transformation1", 1, new_att_val);
			});
		}
	}
	
	function modify_drawing(coluna, fr, prefixo, node_path){//modifica camada de desenho (se tiver vazia muda pra zzero e se for numero renomeia)
		var current_drawing = column.getEntry(coluna, 1, fr);
		var modifyed = false;
		if(!isNaN(current_drawing[0]) && options.rename_poses){
			var renamed = BD2_RenameDrawingWithNumber(coluna, current_drawing, prefixo);
			if(!renamed){
				return false;
			}
			rename_drawing_deform(node_path, current_drawing, renamed);
			modifyed = true;
			counter_rename++;
		}
		if(current_drawing == "" && options.zzero){
			if(!BD2_addZzero(coluna, fr)){
				Print("Error setting drawing to Zzero");
				return false;
			}
			Print("layer changed to Zzero : " + column.getDisplayName(coluna));
			modifyed = true;
			counter_empty++;
		}
		if(options.d_key){
			column.addKeyDrawingExposureAt(coluna, fr);
		}	
		return modifyed;
	}
	
	
	function modify_layers_frames(coluna, col_type, col_name, node_path){
		var pose_index = 0;
		var updated_node = false;
		for(var i = firstFrame; i <= endFrame; i++){
			var prefix = prefix_list[pose_index];
			if(col_type == "DRAWING"){
				var draw = column.getEntry(coluna, 1, i);
				if(modify_drawing(coluna, i, prefix, node_path)){
					updated_node = true;
				}
			} else {
				if(options.c_key){
					column.setKeyFrame(coluna, i);
				}
			}
			pose_index++;
		}
		return updated_node;
	}	
}


function get_options(){//interface simples para pegar options
	
	d = new Dialog;
	d.title = "Rig Check-List";
	d.addSpace(5);

	var l1 = new Label();
	l1.text = "Escolha o que deseja fazer:";
	d.add(l1);

	var group = new GroupBox;		

	var drawing_key = new CheckBox();
	drawing_key.text = "Create Drawing Key;";
	drawing_key.checked = true;
	group.add(drawing_key);
	
	var colun_key = new CheckBox();
	colun_key.text = "Create Transformation Key Frames;";
	colun_key.checked = true;
	group.add(colun_key);

	var empty_zzero = new CheckBox();
	empty_zzero.text = "Empty to Zzero;";
	empty_zzero.checked = true;
	group.add(empty_zzero);

	var rename_rig = new CheckBox();
	rename_rig.text = "Rename RIG poses;";
	rename_rig.checked = true;
	group.add(rename_rig);
	
	var check_full = new CheckBox();
	check_full.text = "Check FULL;";
	check_full.checked = true;
	group.add(check_full);

	d.addSpace(5);
	d.add(group);
	d.addSpace(10);


	
	var rc = d.exec();
	if(!rc){ 
		return false;
	}

	var result = {
		d_key: drawing_key.checked,
		c_key: colun_key.checked,
		zzero: empty_zzero.checked,
		rename_poses: rename_rig.checked,
		check_full: check_full
	}
	
	//test options
	var test = false;
	for(item in result){
		if(result[item]){
			test = true;
		}
	}
	if(!test){
		MessageBox.warning("Nenhuma opção marcada!",0,0);
		return false;
	}
	return result;
}