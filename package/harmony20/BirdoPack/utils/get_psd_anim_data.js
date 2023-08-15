include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");


function get_psd_anim_data(disable_psd_nodes){

	var output_folder = scene.currentProjectPath() + "/frames/EXPORT_DATA/";
	//make sure folder is clean and exists
	BD1_CleanFolder(output_folder);
	var reads = node.getNodes(["READ"]);
	var counter = 1;
	var psd_files_data = {};
	var bg_groups_data = {};
	
	//lista de todos grupos de bg no root
	var bg_groups_list = node.subNodes(node.root()).filter(function(x){ return node.isGroup(x) && /BG/.test(node.getName(x))});
	
	
	//disconecta o bg caso precise
	if(disable_psd_nodes){
		disable_bg();
	}
	
	for(var i=0; i<reads.length; i++){
		var nodeName = node.getName(reads[i]);
		var elementId = node.getElementId(reads[i]);
		//if node drawing has no valid drawings in the library
		if(Drawing.numberOf(elementId) == 0){
			continue;
		}
		
		//test if is a bg node
		var is_bg_node = false;	
		bg_groups_list.forEach(function(item){
			if(reads[i].indexOf(item + "/") != -1){
				is_bg_node = true;
				Print(" -- bg node found: " + reads[i]);
			}
		});
		
		var filePath = Drawing.filename(elementId, Drawing.name(elementId, 0));
		if(BD1_file_extension(filePath) == "psd"){
			
			var psd_name = BD1_fileBasename(filePath).split(".")[0];
			if(!(psd_name in psd_files_data)){
				psd_files_data[psd_name] = {
					"psd_file": filePath,
					"layers": {}
				};
			}
			psd_files_data[psd_name]["layers"][nodeName] = get_node_anim_data(reads[i], isNodeVisible(reads[i]));
			continue;
		} 
		
		if(is_bg_node){//if not psd, test if is a BG node
			var tvg_name = BD1_fileBasename(filePath).split(".")[0];
			var bg_name = tvg_name.replace(nodeName + "-", "");
			if(!(bg_name in bg_groups_data)){
				bg_groups_data[bg_name] = {
					"psd_file": "possible PSD name: " + bg_name + ".psd",
					"layers": {}
				};
			}
			bg_groups_data[bg_name]["layers"][nodeName] = get_node_anim_data(reads[i], isNodeVisible(reads[i]));
		}
	}
	
	//write psd data jsons
	Print("PSD file(s) found in the scene: " + Object.keys(psd_files_data).length);
	for(psd in psd_files_data){
		var jsonFile = output_folder + psd + ".json";
		BD1_WriteJsonFile(psd_files_data[psd], jsonFile);
		counter++;
	}

	//write bg files jsons
	Print("BG file(s) found in the scene: " + Object.keys(bg_groups_data).length);
	for(bg in bg_groups_data){
		var jsonFile = output_folder + bg + ".json";
		BD1_WriteJsonFile(bg_groups_data[bg], jsonFile);
		counter++;
	}

	var jsonCamera = output_folder + "_camera.json";
	BD1_WriteJsonFile(get_camera_anim_data(), jsonCamera);
	Print("Camera json created!");
	
	Print("Json psd file(s) created: " + counter);
	
	return jsonCamera;
	
	//extra
	function disable_bg(){//desconecta o bg da comp final
		var multiport_setup = "Top/SETUP/Multi-Port-In";
		var comp_final = "Top/SETUP/FINAL";
		return node.unlink(comp_final, 0);
	}

	/* return true if node is visible and connected to _FINAL display		
	*/
	function isNodeVisible(nodePath){
		if(!node.isLinked(nodePath, 0) || !node.getEnable(nodePath)){
			return false;
		}
		var displaysAndVisiList = BD2_ListNodesDown(nodePath, ["DISPLAY", "VISIBILITY"], null);
		var isDisplayFinal = false;
		var hasVisibilityOn = true;
		displaysAndVisiList.forEach(function(item){
			if(node.type(item) == "DISPLAY" && node.getName(item) == "_FINAL"){
				isDisplayFinal = true;
			}
			if(node.type(item) == "VISIBILITY"){
				var wAttr = node.getAttr(item, 1, "softrender");
				if(!wAttr.boolValue()){
					hasVisibilityOn = false;
				}
			}
		});
		return isDisplayFinal && hasVisibilityOn;
	}
}

/* Get a node path and return an array of coordinates (position, rotation,
scale, skew) and exposure for each frame of the scene in fields.*/
function get_node_anim_data(nodePath, isVisible){
	if(node.type(nodePath) != "READ" && node.type(nodePath) != "PEG"){
		Print("[getFullCoordFromNode]> Not a drawing or peg node.");
		return false;
	}
	var finalObj = {
		"visible": isVisible,
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

/* Returns an array of coordinates (position, rotation, scale)
of active camera.*/
function get_camera_anim_data(){
	var arr = [];
	for(var i=1; i<=frame.numberOf(); i++){
		var obj = {};
		var mat = scene.getCameraMatrix(i);
		var pos = mat.extractPosition()
		obj["pos"] = [pos.x, pos.y, pos.z];
		var rot = mat.extractRotation(); 
		obj["rot"] = [rot.x, rot.y, rot.z];
		var scale = mat.extractScale();
		obj["scl"] = [scale.x, scale.y, scale.z];
		arr.push(obj);
	}
	return arr;
}

exports.get_psd_anim_data = get_psd_anim_data;
exports.get_node_anim_data = get_node_anim_data;
exports.get_camera_anim_data = get_camera_anim_data;
