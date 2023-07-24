# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'dialog.ui'
#
# Created: Mon Jul 24 20:38:08 2023
#      by: pyside-uic 0.2.15 running on PySide 1.2.4
#
# WARNING! All changes made in this file will be lost!

from PySide import QtCore, QtGui

class Ui_Form(object):
    def setupUi(self, Form):
        Form.setObjectName("Form")
        Form.resize(800, 600)
        Form.setStyleSheet("QLabel {\n"
"    color: lightgray;\n"
"}\n"
"\n"
"QLabel:disabled{\n"
"    color: rgb(170, 160, 160);\n"
"}\n"
"\n"
"QWidget{\n"
"    background-color: gray;\n"
"}\n"
"\n"
"QGroupBox {\n"
"    color: lightgray;\n"
"    border: 2px solid lightgray;\n"
"}\n"
"\n"
"QScrollBar::handle {\n"
"    border-radius: 5px;\n"
"     border: 2px solid lightgray;\n"
"    background-color: gray;\n"
"}\n"
"\n"
"QScrollBar::add-page{ \n"
"    border: none;\n"
"    background-color: rgb(86, 86, 86);\n"
"}\n"
"\n"
"QScrollBar::sub-page {\n"
"    background-color: rgb(86, 86, 86);\n"
"    border: none;\n"
"}\n"
"\n"
"QScrollBar::add-line {\n"
"    border: none;\n"
"    background-color: rgb(86, 86, 86);\n"
"}\n"
"\n"
"QScrollBar::sub-line {\n"
"    border: none;\n"
"    background-color: rgb(86, 86, 86);\n"
"}\n"
"\n"
"QScrollBar:arrow{\n"
"    border: none;\n"
"    background: none;\n"
"    color: none;\n"
"}\n"
"\n"
"QListWidget:disabled {\n"
"    color: rgb(250, 150, 120);\n"
"    background-color: rgb(120, 105, 105);\n"
"}\n"
"\n"
"QListWidget {\n"
"    color: lightgray;\n"
"    background-color: rgb(86, 86, 86);\n"
"    border-radius: 10px;\n"
"    padding: 5px;\n"
"}\n"
"\n"
"QListWidget::item:hover {\n"
"    color: rgb(80, 64, 44);\n"
"    background: #05B8CC;\n"
"    border: white;\n"
"}\n"
"\n"
"QListWidget::item:selected {\n"
"    color: rgb(80, 25, 44);\n"
"    border: none;\n"
"    background-color: rgb(79, 255, 52);\n"
"}\n"
"\n"
"QListWidget::item:selected:active{\n"
"    color: rgb(80, 64, 44);\n"
"    background-color: rgb(187, 240, 255);\n"
"    border: gray;\n"
"    padding-left: 5px;\n"
"}\n"
"\n"
"QListWidget::item:selected:!active {\n"
"    background: rgb(91, 174, 181);\n"
"    border: none;\n"
"}\n"
"\n"
"QCheckBox {\n"
"    color: white;\n"
"    spacing: 5px;\n"
"}\n"
"\n"
"QCheckBox::indicator:unchecked {\n"
"    border: 2px solid white;\n"
"    border-radius: 2px;\n"
"    background-color: lightgray;\n"
"}\n"
"\n"
"QCheckBox::indicator:checked {\n"
"    border: 2px solid lightgray;\n"
"    border-radius: 1px;\n"
"    background-color: rgb(68, 68, 68);\n"
"}\n"
"\n"
"QCheckBox:disabled{\n"
"    color: rgb(250, 150, 120);\n"
"}\n"
"\n"
"QCheckBox::indicator:checked:disabled {\n"
"    color: rgb(250, 90, 120);\n"
"    background-color: rgb(250, 200, 200);\n"
"    border-color: rgb(255, 230, 220);\n"
"}\n"
"")
        self.gridLayout_3 = QtGui.QGridLayout(Form)
        self.gridLayout_3.setObjectName("gridLayout_3")
        self.gridLayout_2 = QtGui.QGridLayout()
        self.gridLayout_2.setObjectName("gridLayout_2")
        self.gridLayout = QtGui.QGridLayout()
        self.gridLayout.setObjectName("gridLayout")
        self.listVersions = QtGui.QListWidget(Form)
        self.listVersions.setEnabled(False)
        self.listVersions.setObjectName("listVersions")
        self.gridLayout.addWidget(self.listVersions, 1, 2, 1, 1)
        self.label_3 = QtGui.QLabel(Form)
        self.label_3.setObjectName("label_3")
        self.gridLayout.addWidget(self.label_3, 0, 1, 1, 1)
        self.label_2 = QtGui.QLabel(Form)
        self.label_2.setObjectName("label_2")
        self.gridLayout.addWidget(self.label_2, 0, 0, 1, 1)
        self.label_4 = QtGui.QLabel(Form)
        self.label_4.setObjectName("label_4")
        self.gridLayout.addWidget(self.label_4, 0, 2, 1, 1)
        self.listEpisodes = QtGui.QListWidget(Form)
        self.listEpisodes.setEnabled(False)
        self.listEpisodes.setObjectName("listEpisodes")
        self.gridLayout.addWidget(self.listEpisodes, 1, 0, 1, 1)
        self.listScenes = QtGui.QListWidget(Form)
        self.listScenes.setEnabled(False)
        self.listScenes.setObjectName("listScenes")
        self.gridLayout.addWidget(self.listScenes, 1, 1, 1, 1)
        spacerItem = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.gridLayout.addItem(spacerItem, 2, 0, 1, 1)
        self.gridLayout_2.addLayout(self.gridLayout, 3, 0, 1, 1)
        self.horizontalLayout_2 = QtGui.QHBoxLayout()
        self.horizontalLayout_2.setObjectName("horizontalLayout_2")
        self.line = QtGui.QFrame(Form)
        self.line.setFrameShape(QtGui.QFrame.VLine)
        self.line.setFrameShadow(QtGui.QFrame.Sunken)
        self.line.setObjectName("line")
        self.horizontalLayout_2.addWidget(self.line)
        self.title = QtGui.QLabel(Form)
        font = QtGui.QFont()
        font.setPointSize(19)
        self.title.setFont(font)
        self.title.setObjectName("title")
        self.horizontalLayout_2.addWidget(self.title)
        spacerItem1 = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.horizontalLayout_2.addItem(spacerItem1)
        self.logoProj = QtGui.QLabel(Form)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.logoProj.sizePolicy().hasHeightForWidth())
        self.logoProj.setSizePolicy(sizePolicy)
        self.logoProj.setMinimumSize(QtCore.QSize(0, 70))
        self.logoProj.setMaximumSize(QtCore.QSize(184, 70))
        self.logoProj.setScaledContents(True)
        self.logoProj.setAlignment(QtCore.Qt.AlignCenter)
        self.logoProj.setObjectName("logoProj")
        self.horizontalLayout_2.addWidget(self.logoProj)
        self.horizontalLayout_2.setStretch(0, 1)
        self.horizontalLayout_2.setStretch(1, 1)
        self.horizontalLayout_2.setStretch(2, 1)
        self.horizontalLayout_2.setStretch(3, 1)
        self.gridLayout_2.addLayout(self.horizontalLayout_2, 0, 0, 1, 2)
        self.verticalLayout = QtGui.QVBoxLayout()
        self.verticalLayout.setObjectName("verticalLayout")
        self.label = QtGui.QLabel(Form)
        self.label.setObjectName("label")
        self.verticalLayout.addWidget(self.label)
        spacerItem2 = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.verticalLayout.addItem(spacerItem2)
        self.checkBox_open_local = QtGui.QCheckBox(Form)
        self.checkBox_open_local.setEnabled(False)
        self.checkBox_open_local.setStyleSheet("")
        self.checkBox_open_local.setObjectName("checkBox_open_local")
        self.verticalLayout.addWidget(self.checkBox_open_local)
        self.label_7 = QtGui.QLabel(Form)
        self.label_7.setObjectName("label_7")
        self.verticalLayout.addWidget(self.label_7)
        self.label_info = QtGui.QLabel(Form)
        self.label_info.setEnabled(False)
        self.label_info.setMinimumSize(QtCore.QSize(100, 0))
        self.label_info.setFrameShape(QtGui.QFrame.Box)
        self.label_info.setAlignment(QtCore.Qt.AlignJustify|QtCore.Qt.AlignVCenter)
        self.label_info.setWordWrap(True)
        self.label_info.setMargin(5)
        self.label_info.setObjectName("label_info")
        self.verticalLayout.addWidget(self.label_info)
        spacerItem3 = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.verticalLayout.addItem(spacerItem3)
        self.checkBox_all_versions = QtGui.QCheckBox(Form)
        self.checkBox_all_versions.setEnabled(False)
        self.checkBox_all_versions.setChecked(False)
        self.checkBox_all_versions.setObjectName("checkBox_all_versions")
        self.verticalLayout.addWidget(self.checkBox_all_versions)
        self.label_8 = QtGui.QLabel(Form)
        self.label_8.setObjectName("label_8")
        self.verticalLayout.addWidget(self.label_8)
        self.comboStep = QtGui.QComboBox(Form)
        self.comboStep.setEnabled(False)
        self.comboStep.setStyleSheet("QComboBox {\n"
"    color: black;\n"
"    border: 2px solid white;\n"
"    border-radius: 6px;\n"
"    padding: 1px 18px 1px 3px;\n"
"    min-width: 6em;\n"
"}\n"
"\n"
"QComboBox:!editable, QComboBox::drop-down:editable {\n"
"     background: lightgray;\n"
"}\n"
"\n"
"QComboBox:on { /* shift the text when the popup opens */\n"
"    padding-top: 3px;\n"
"    padding-left: 4px;\n"
"}\n"
"\n"
"QComboBox::drop-down {\n"
"    width: 20px;\n"
"    background-color: rgb(194, 194, 194);\n"
"    border-left-width: 2px;\n"
"    border-left-color: white;\n"
"    border-left-style: solid; /* just a single line */\n"
"    border-top-right-radius: 3px; /* same radius as the QComboBox */\n"
"    border-bottom-right-radius: 3px;\n"
"}\n"
"\n"
"QComboBox:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: gray;\n"
"}\n"
"\n"
"QComboBox QAbstractItemView{\n"
"    border: 2px solid white;\n"
"    border-radius: 10px;\n"
"    color: gray;\n"
"    background-color: lightgray;\n"
"    selection-background-color: #05B8CC;\n"
"    selection-color: white;\n"
"    padding: 3px 3px ;\n"
"}\n"
"\n"
"QComboBox:disabled{\n"
"    color: rgb(250, 150, 120);\n"
"    background-color: rgb(220, 190, 190);\n"
"    border-color: lightgray;\n"
"}")
        self.comboStep.setObjectName("comboStep")
        self.verticalLayout.addWidget(self.comboStep)
        spacerItem4 = QtGui.QSpacerItem(20, 40, QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Expanding)
        self.verticalLayout.addItem(spacerItem4)
        self.gridLayout_2.addLayout(self.verticalLayout, 3, 1, 1, 1)
        self.horizontalLayout = QtGui.QHBoxLayout()
        self.horizontalLayout.setObjectName("horizontalLayout")
        self.label_5 = QtGui.QLabel(Form)
        self.label_5.setEnabled(False)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.label_5.sizePolicy().hasHeightForWidth())
        self.label_5.setSizePolicy(sizePolicy)
        self.label_5.setMaximumSize(QtCore.QSize(16777215, 25))
        self.label_5.setObjectName("label_5")
        self.horizontalLayout.addWidget(self.label_5)
        self.progress_bar = QtGui.QProgressBar(Form)
        self.progress_bar.setEnabled(False)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.progress_bar.sizePolicy().hasHeightForWidth())
        self.progress_bar.setSizePolicy(sizePolicy)
        self.progress_bar.setMinimumSize(QtCore.QSize(300, 20))
        self.progress_bar.setMaximumSize(QtCore.QSize(400, 25))
        self.progress_bar.setStyleSheet("QProgressBar {\n"
"    color: lightgray;\n"
"    padding: 2 2px;\n"
"    border: 2px solid lightgray;\n"
"    border-radius: 5px;\n"
"}\n"
"\n"
"QProgressBar::chunk {\n"
" background-color: #05B8CC;\n"
" width: 20px;\n"
"}")
        self.progress_bar.setProperty("value", 0)
        self.progress_bar.setAlignment(QtCore.Qt.AlignCenter)
        self.progress_bar.setFormat("")
        self.progress_bar.setObjectName("progress_bar")
        self.horizontalLayout.addWidget(self.progress_bar)
        self.open_button = QtGui.QPushButton(Form)
        self.open_button.setEnabled(False)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.open_button.sizePolicy().hasHeightForWidth())
        self.open_button.setSizePolicy(sizePolicy)
        self.open_button.setMinimumSize(QtCore.QSize(84, 20))
        self.open_button.setMaximumSize(QtCore.QSize(16777215, 25))
        font = QtGui.QFont()
        font.setPointSize(8)
        font.setWeight(75)
        font.setBold(True)
        self.open_button.setFont(font)
        self.open_button.setStyleSheet("QPushButton {\n"
"    color: rgb(72, 72, 72);\n"
"    border: 2px solid white;\n"
"    border-radius: 6px;\n"
"    background-color: lightgray;\n"
"    min-width: 80px;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    color: white;\n"
"    border-color: white;\n"
"    background-color: #05B8CC;\n"
"}\n"
"\n"
"QPushButton:flat {\n"
"    border: none; /* no border for a flat push button */\n"
"}\n"
"\n"
"QPushButton:default {\n"
"    border-color: navy; /* make the default button prominent */\n"
"}\n"
"\n"
"QPushButton:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: black;\n"
"}\n"
"\n"
"QPushButton::disabled {\n"
"    border-color: darkgray;\n"
"    color: gray;\n"
"}")
        self.open_button.setObjectName("open_button")
        self.horizontalLayout.addWidget(self.open_button)
        self.cancel_button = QtGui.QPushButton(Form)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.cancel_button.sizePolicy().hasHeightForWidth())
        self.cancel_button.setSizePolicy(sizePolicy)
        self.cancel_button.setMinimumSize(QtCore.QSize(84, 20))
        self.cancel_button.setMaximumSize(QtCore.QSize(100, 25))
        font = QtGui.QFont()
        font.setPointSize(8)
        font.setWeight(75)
        font.setBold(True)
        self.cancel_button.setFont(font)
        self.cancel_button.setStyleSheet("QPushButton {\n"
"    color: rgb(72, 72, 72);\n"
"    border: 2px solid white;\n"
"    border-radius: 6px;\n"
"    background-color: lightgray;\n"
"    min-width: 80px;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    color: red;\n"
"    background-color: rgb(255, 196, 197);\n"
"}\n"
"\n"
"QPushButton:flat {\n"
"    border: none; /* no border for a flat push button */\n"
"}\n"
"\n"
"QPushButton:default {\n"
"    border-color: navy; /* make the default button prominent */\n"
"}\n"
"\n"
"QPushButton:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: black;\n"
"}")
        self.cancel_button.setObjectName("cancel_button")
        self.horizontalLayout.addWidget(self.cancel_button)
        self.gridLayout_2.addLayout(self.horizontalLayout, 4, 0, 1, 2)
        self.explorer_path = QtGui.QLineEdit(Form)
        self.explorer_path.setText("")
        self.explorer_path.setObjectName("explorer_path")
        self.gridLayout_2.addWidget(self.explorer_path, 1, 0, 1, 1)
        spacerItem5 = QtGui.QSpacerItem(40, 20, QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Minimum)
        self.gridLayout_2.addItem(spacerItem5, 2, 0, 1, 1)
        self.explorer_btn = QtGui.QPushButton(Form)
        self.explorer_btn.setObjectName("explorer_btn")
        self.gridLayout_2.addWidget(self.explorer_btn, 1, 1, 1, 1)
        self.gridLayout_3.addLayout(self.gridLayout_2, 0, 0, 1, 1)

        self.retranslateUi(Form)
        QtCore.QMetaObject.connectSlotsByName(Form)

    def retranslateUi(self, Form):
        Form.setWindowTitle(QtGui.QApplication.translate("Form", "Form", None, QtGui.QApplication.UnicodeUTF8))
        self.listVersions.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Escolha a versao da cena</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.label_3.setText(QtGui.QApplication.translate("Form", "Scene", None, QtGui.QApplication.UnicodeUTF8))
        self.label_2.setText(QtGui.QApplication.translate("Form", "Episode", None, QtGui.QApplication.UnicodeUTF8))
        self.label_4.setText(QtGui.QApplication.translate("Form", "Version", None, QtGui.QApplication.UnicodeUTF8))
        self.listEpisodes.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Escolha um episodio.</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.listScenes.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Escolha uma cena</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.title.setText(QtGui.QApplication.translate("Form", "Open Scene", None, QtGui.QApplication.UnicodeUTF8))
        self.logoProj.setText(QtGui.QApplication.translate("Form", "LOGO PROJ", None, QtGui.QApplication.UnicodeUTF8))
        self.label.setText(QtGui.QApplication.translate("Form", "Extra Options", None, QtGui.QApplication.UnicodeUTF8))
        self.checkBox_open_local.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Forca abrir a cena local, caso vc queira abrir a versao dessa cena local</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.checkBox_open_local.setText(QtGui.QApplication.translate("Form", "Open Local File", None, QtGui.QApplication.UnicodeUTF8))
        self.label_7.setText(QtGui.QApplication.translate("Form", "Last Version:", None, QtGui.QApplication.UnicodeUTF8))
        self.label_info.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Informacoes sobre a versao mais recente do shot selecionado. </p><p>step: se esta no SETUP, na animacao (ANIM) ou se ainda nao foi criado (ANIMATIC)</p><p>file: origem do arquivo. Se esta local ou no server</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.label_info.setText(QtGui.QApplication.translate("Form", "<html><head/><body><p>version: v00</p><p>step: NONE</p><p>file: NONE</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.checkBox_all_versions.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Marque para ver todas as versoes da cena selecionada, e nao somente a ultima versao.</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.checkBox_all_versions.setText(QtGui.QApplication.translate("Form", "Show All Versions", None, QtGui.QApplication.UnicodeUTF8))
        self.label_8.setText(QtGui.QApplication.translate("Form", "Open in Step:", None, QtGui.QApplication.UnicodeUTF8))
        self.comboStep.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Escolha o Step que deseja abrir a cena. </p><p>OBS: O padrao para seu perfil de usuario ja vem definido como default. Somente mude se pretende abrir uma cena de outro STEP.</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.label_5.setText(QtGui.QApplication.translate("Form", "@leobazao - Birdo 2021", None, QtGui.QApplication.UnicodeUTF8))
        self.open_button.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Abre a versao da cena selecionada.</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.open_button.setText(QtGui.QApplication.translate("Form", "Open Scene", None, QtGui.QApplication.UnicodeUTF8))
        self.cancel_button.setToolTip(QtGui.QApplication.translate("Form", "<html><head/><body><p>Cancela e fecha interface.</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.cancel_button.setText(QtGui.QApplication.translate("Form", "Close", None, QtGui.QApplication.UnicodeUTF8))
        self.explorer_btn.setText(QtGui.QApplication.translate("Form", "open folder", None, QtGui.QApplication.UnicodeUTF8))

