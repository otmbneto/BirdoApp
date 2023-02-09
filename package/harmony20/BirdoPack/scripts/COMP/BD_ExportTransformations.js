 /*###########################################################################
#                                                                  _    _     #
#  BD_ExportTransformations.js                                    , `._) '>   #
#                                                                 '//,,,  |   #
#                                                                     )_/     #
#    by: ~camelo                   '||                     ||`       /_|      #
#    e-mail: oi@camelo.de           ||      ''             ||                 #
#                                   ||''|,  ||  '||''| .|''||  .|''|,         #
#    created: 08/02/2023            ||  ||  ||   ||    ||  ||  ||  ||         #
#    modified: 09/02/2023          .||..|' .||. .||.   `|..||. `|..|'         #
#                                                                             #
 ###########################################################################*/

/*

  Comp toolbar Harmony script. Project independent.
  Exports animation data (pos, rot, scale and skew)
  of selected drawings and pegs nodes. Requires core
  functionality from `utils/get_psd_anim_data.js`.

*/

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
	var projectData = BD2_ProjectInfo();
	var getPsdAnimDataPath = projectData.birdoApp + "package\harmony20\BirdoPack\scripts\COMP\BD_ExportTransformations.js";
	var getPsdAnimDataObj = require(getPsdAnimDataPath);

	var finalData = {
					"psd_file": "NO PSD FILE! Data was exported manually.",
					"layers": {}
	};
	for(var i = 0; i < arr.length; i = i + 1)
	{
		finalData["layers"][node.getName(arr[i])] = getPsdAnimDataObj.get_node_anim_data(arr[i]);
	}
	BD1_WriteJsonFile(finalData, dataFilePath);
	MessageBox.information("Arquivo .json salvo.", 1, 0, 0, "Sucesso!");
	return;
}
