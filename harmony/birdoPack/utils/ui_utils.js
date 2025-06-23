/*
	este script lista funcoes para lidar com a nodeview no harmony
	como organizar e conectar waypoints
*/
include("BD_1-ScriptLIB_File.js");
include("BD_2-ScriptLIB_Geral.js");

//ui signals filter per harmony version (24 is different on the way to connect this king of signals
var signals = {
	"combo": about.getMajorVersion() < 24 ? "[\"currentIndexChanged(int)\"]" : "currentIndexChanged",
	"spin": about.getMajorVersion() < 24 ? "[\"valueChanged(int)\"]" : "valueChanged",
	"tab": about.getMajorVersion() < 24 ? "[\"currentChanged(int)\"]" : "currentChanged",
	"line_edit": about.getMajorVersion() < 24 ? "[\"textEdited(QString)\"]" : "textEdited"
};

function get_connect_string(ui_name, widget_type, func){
	return ui_name + "." + signals[widget_type] + ".connect(this, " + func	+ ")";
}
exports.get_connect_string = get_connect_string;