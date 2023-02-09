// get header

include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

function BD_ExportTransformations()
{
	if(!selection.numberOfNodesSelected())
	{
		MessageBox.information("Nenhum node selecionado.", 1, 0, 0, "Seleçao Vazia");
 		return;
	}

	var arr = selection.selectedNodes();
	for(var i = 0; i < arr.length; i = i + 1)
	{
		var type = node.type(arr[i]);
		if(type == "READ" || type == "PEG")
			continue;
		MessageBox.information("Os nodes devem ser Drawings ou Pegs.", 1, 0, 0, "Tipo de node inválido");
 		return;
	}
	
	var dataFilePath = FileDialog.getSaveFileName(".json", "Escolha onde salvar os dados de transformaçao:");
	if(!dataFilePath)
	{
		MessageBox.information("Arquivo inválido.", 1, 0, 0, "Arquivo Inválido");
 		return;
	}
	var f = new File(dataFilePath);
	// if ( f.exists )
	// {
	// 	var msg = "O arquivo \"" + f.name + "\" será substituído. Do you wish to overwrite Confirmar?"
	//	var ans = MessageBox.warning(msg, MessageBox.Yes, MessageBox.No);
	//	if(ans != MessageBox.Yes)
	//		return;
	//}

	var finalData = {
					"psd_file": "NO PSD FILE! Data was exported manually.",
					"layers": {}
	};
	for(var i = 0; i < arr.length; i = i + 1)
	{
		finalData["layers"][node.getName(arr[i])] = get_node_anim_data(arr[0]);
	}
	BD1_WriteJsonFile(finalData, dataFilePath);
	MessageBox.information("Arquivo .json salvo.", 1, 0, 0, "Sucesso!");
	return;

	// FIXME ! importar do /utils/get_psd_anim_data.js ?
	function get_node_anim_data(nodePath){
		if(node.type(nodePath) != "READ" && node.type(nodePath) != "PEG"){
			Print("[getFullCoordFromNode]> Not a drawing or peg node.");
			return false;
		}
		var finalObj = {
			"visible": "Not applicable.",
			"frames": []
		};
		var columnId = node.linkedColumn(nodePath, "DRAWING.ELEMENT");

		for(var i=1; i<=frame.numberOf(); i++){
			var obj = {};
			var mat = node.getMatrix(nodePath, i);
			var pos = mat.extractPosition()
			obj["pos"] = [pos.x, pos.y, pos.z];
			var rot = mat.extractRotation(); 
			obj["rot"] = [rot.x, rot.y, rot.z];
			var scale = mat.extractScale();
			obj["scl"] = [scale.x, scale.y, scale.z];
			obj["skw"] = mat.extractSkew();
			var exposure = column.getEntry(columnId, 1, i);
			obj["exposure"] = exposure;
			finalObj.frames.push(obj);
		}
		return finalObj;
	}
}
