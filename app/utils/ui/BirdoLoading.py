# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'BirdoLoading.ui'
#
# Created: Tue Aug  3 12:00:30 2021
#      by: pyside-uic 0.2.15 running on PySide 1.2.4
#
# WARNING! All changes made in this file will be lost!

from PySide import QtCore, QtGui

class Ui_Form(object):
    def setupUi(self, Form):
        Form.setObjectName("Form")
        Form.resize(410, 150)
        Form.setStyleSheet("QWidget{    \n"
"    background-color: rgb(91, 91, 91);\n"
"}\n"
"")
        self.frame = QtGui.QFrame(Form)
        self.frame.setGeometry(QtCore.QRect(0, 0, 410, 150))
        self.frame.setFrameShape(QtGui.QFrame.WinPanel)
        self.frame.setFrameShadow(QtGui.QFrame.Raised)
        self.frame.setObjectName("frame")
        self.logo = QtGui.QLabel(self.frame)
        self.logo.setGeometry(QtCore.QRect(10, 10, 131, 131))
        self.logo.setText("")
        self.logo.setScaledContents(True)
        self.logo.setObjectName("logo")
        self.label_birdo = QtGui.QLabel(self.frame)
        self.label_birdo.setGeometry(QtCore.QRect(150, 20, 141, 61))
        font = QtGui.QFont()
        font.setFamily("Times New Roman")
        font.setPointSize(38)
        self.label_birdo.setFont(font)
        self.label_birdo.setObjectName("label_birdo")
        self.label_loading = QtGui.QLabel(self.frame)
        self.label_loading.setGeometry(QtCore.QRect(150, 80, 211, 20))
        font = QtGui.QFont()
        font.setPointSize(9)
        font.setWeight(50)
        font.setBold(False)
        self.label_loading.setFont(font)
        self.label_loading.setStyleSheet("QLabel{\n"
"    color: gray;\n"
"}\n"
"")
        self.label_loading.setObjectName("label_loading")
        self.loading_text = QtGui.QLabel(self.frame)
        self.loading_text.setGeometry(QtCore.QRect(160, 110, 241, 31))
        font = QtGui.QFont()
        font.setPointSize(8)
        self.loading_text.setFont(font)
        self.loading_text.setLayoutDirection(QtCore.Qt.LeftToRight)
        self.loading_text.setStyleSheet("QLabel{\n"
"    color: lightgray;\n"
"}\n"
"")
        self.loading_text.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.loading_text.setMargin(0)
        self.loading_text.setObjectName("loading_text")
        self.label_birdo_2 = QtGui.QLabel(self.frame)
        self.label_birdo_2.setGeometry(QtCore.QRect(290, 40, 101, 41))
        font = QtGui.QFont()
        font.setFamily("MS Shell Dlg 2")
        font.setPointSize(27)
        font.setWeight(50)
        font.setItalic(False)
        font.setBold(False)
        self.label_birdo_2.setFont(font)
        self.label_birdo_2.setStyleSheet("QLabel {\n"
"    color: gray;\n"
"}")
        self.label_birdo_2.setAlignment(QtCore.Qt.AlignBottom|QtCore.Qt.AlignLeading|QtCore.Qt.AlignLeft)
        self.label_birdo_2.setObjectName("label_birdo_2")
        self.label = QtGui.QLabel(self.frame)
        self.label.setGeometry(QtCore.QRect(290, 20, 101, 16))
        self.label.setStyleSheet("QLabel {\n"
"    color: gray;\n"
"}")
        self.label.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.label.setObjectName("label")

        self.retranslateUi(Form)
        QtCore.QMetaObject.connectSlotsByName(Form)

    def retranslateUi(self, Form):
        Form.setWindowTitle(QtGui.QApplication.translate("Form", "Form", None, QtGui.QApplication.UnicodeUTF8))
        self.label_birdo.setText(QtGui.QApplication.translate("Form", "birdo", None, QtGui.QApplication.UnicodeUTF8))
        self.label_loading.setText(QtGui.QApplication.translate("Form", "Loading application...", None, QtGui.QApplication.UnicodeUTF8))
        self.loading_text.setText(QtGui.QApplication.translate("Form", "imput loading text here", None, QtGui.QApplication.UnicodeUTF8))
        self.label_birdo_2.setText(QtGui.QApplication.translate("Form", "app", None, QtGui.QApplication.UnicodeUTF8))
        self.label.setText(QtGui.QApplication.translate("Form", "v1.0", None, QtGui.QApplication.UnicodeUTF8))


if __name__ == "__main__":
    import sys
    app = QtGui.QApplication(sys.argv)
    Form = QtGui.QWidget()
    ui = Ui_Form()
    ui.setupUi(Form)
    Form.show()
    sys.exit(app.exec_())

