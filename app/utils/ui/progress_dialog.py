# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'ProgressDialog.ui'
#
# Created: Thu Sep  9 01:17:06 2021
#      by: pyside-uic 0.2.15 running on PySide 1.2.4
#
# WARNING! All changes made in this file will be lost!

from PySide import QtCore, QtGui

class Ui_Form(object):
    def setupUi(self, Form):
        Form.setObjectName("Form")
        Form.resize(350, 170)
        Form.setStyleSheet("QWidget{\n"
"    background: #666666;\n"
"}\n"
"\n"
"QLabel {\n"
"    color: lightgray;\n"
"}\n"
"\n"
"QPushButton {\n"
"    color: rgb(72, 72, 72);\n"
"    border: 2px solid white;\n"
"    border-radius: 6px;\n"
"    background-color: lightgray;\n"
"    min-width: 80px;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    color: gray;\n"
"    background-color: rgb(255, 196, 197);\n"
"}\n"
"\n"
"QPushButton:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: black;\n"
"}\n"
"\n"
"QProgressBar {\n"
"    color: lightgray;\n"
"    background: transparent;\n"
"    border: 2px solid lightgray;\n"
"    border-radius: 5px;\n"
"}\n"
"\n"
"QProgressBar::chunk{\n"
"    background-color: #05B8CC;\n"
"    border-radius: 5px;\n"
"    margin: 2px;\n"
"}")
        self.verticalLayout_2 = QtGui.QVBoxLayout(Form)
        self.verticalLayout_2.setContentsMargins(20, -1, 20, 20)
        self.verticalLayout_2.setObjectName("verticalLayout_2")
        self.verticalLayout = QtGui.QVBoxLayout()
        self.verticalLayout.setSpacing(6)
        self.verticalLayout.setObjectName("verticalLayout")
        self.title_label = QtGui.QLabel(Form)
        font = QtGui.QFont()
        font.setPointSize(11)
        self.title_label.setFont(font)
        self.title_label.setObjectName("title_label")
        self.verticalLayout.addWidget(self.title_label)
        spacerItem = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.verticalLayout.addItem(spacerItem)
        self.progressBar = QtGui.QProgressBar(Form)
        self.progressBar.setProperty("value", 24)
        self.progressBar.setAlignment(QtCore.Qt.AlignCenter)
        self.progressBar.setObjectName("progressBar")
        self.verticalLayout.addWidget(self.progressBar)
        self.loading_label = QtGui.QLabel(Form)
        self.loading_label.setMinimumSize(QtCore.QSize(0, 20))
        self.loading_label.setFrameShape(QtGui.QFrame.NoFrame)
        self.loading_label.setFrameShadow(QtGui.QFrame.Sunken)
        self.loading_label.setMargin(0)
        self.loading_label.setIndent(-1)
        self.loading_label.setObjectName("loading_label")
        self.verticalLayout.addWidget(self.loading_label)
        self.verticalLayout.setStretch(0, 1)
        self.verticalLayout_2.addLayout(self.verticalLayout)
        self.horizontalLayout = QtGui.QHBoxLayout()
        self.horizontalLayout.setObjectName("horizontalLayout")
        spacerItem1 = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.horizontalLayout.addItem(spacerItem1)
        self.cancel_button = QtGui.QPushButton(Form)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.cancel_button.sizePolicy().hasHeightForWidth())
        self.cancel_button.setSizePolicy(sizePolicy)
        self.cancel_button.setMinimumSize(QtCore.QSize(84, 25))
        self.cancel_button.setMaximumSize(QtCore.QSize(16777215, 40))
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.cancel_button.setFont(font)
        self.cancel_button.setObjectName("cancel_button")
        self.horizontalLayout.addWidget(self.cancel_button)
        self.horizontalLayout.setStretch(0, 2)
        self.horizontalLayout.setStretch(1, 1)
        self.verticalLayout_2.addLayout(self.horizontalLayout)
        self.verticalLayout_2.setStretch(0, 1)
        self.verticalLayout_2.setStretch(1, 1)

        self.retranslateUi(Form)
        QtCore.QMetaObject.connectSlotsByName(Form)

    def retranslateUi(self, Form):
        Form.setWindowTitle(QtGui.QApplication.translate("Form", "BirdoApp", None, QtGui.QApplication.UnicodeUTF8))
        self.title_label.setText(QtGui.QApplication.translate("Form", "Loading Title", None, QtGui.QApplication.UnicodeUTF8))
        self.loading_label.setText(QtGui.QApplication.translate("Form", "loadingMessage...", None, QtGui.QApplication.UnicodeUTF8))
        self.cancel_button.setText(QtGui.QApplication.translate("Form", "Cancel", None, QtGui.QApplication.UnicodeUTF8))


if __name__ == "__main__":
    import sys
    app = QtGui.QApplication(sys.argv)
    Form = QtGui.QWidget()
    ui = Ui_Form()
    ui.setupUi(Form)
    Form.show()
    sys.exit(app.exec_())

