# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'BirdoApp_Login_Page.ui'
#
# Created: Fri Sep 17 23:51:14 2021
#      by: pyside-uic 0.2.15 running on PySide 1.2.4
#
# WARNING! All changes made in this file will be lost!

from PySide import QtCore, QtGui

class Ui_MainWindow(object):
    def setupUi(self, MainWindow):
        MainWindow.setObjectName("MainWindow")
        MainWindow.resize(444, 735)
        MainWindow.setStyleSheet("QWidget{\n"
"    background: rgb(91, 91, 91);\n"
"}\n"
"\n"
"QMenu {\n"
"    background-color: #666666;\n"
"}\n"
"\n"
"QMenu::item:hover {\n"
"    color: lightgray;\n"
"    background-color: blue;\n"
"}\n"
"\n"
"QMenuBar {\n"
"    color: rgb(182, 182, 182);\n"
"    background-color: transparent;\n"
"}\n"
"\n"
"QMenuBar::item {\n"
"    background-color: transparent;\n"
"}\n"
"\n"
"QMenuBar::item:selected { /* when selected using mouse or keyboard */\n"
"    background-color: #666666;\n"
"}\n"
"\n"
"QMenuBar::item:hover {\n"
"    background: #777777;\n"
"}\n"
"\n"
"QLabel {\n"
"    color: lightgray;\n"
"}\n"
"\n"
"QLabel:!enabled {\n"
"    color: gray;\n"
"}\n"
"\n"
"QLineEdit:!enabled {\n"
"    color: gray;\n"
"    background-color: #555555;\n"
"    border-color: gray;\n"
"}\n"
"\n"
"QLineEdit {\n"
"    color: black;\n"
"    border: 2px solid white;\n"
"    border-radius: 8px;\n"
"    padding: 0 8px;\n"
"    background: lightgray;\n"
"    selection-background-color: darkgray;\n"
"}\n"
"\n"
"QLineEdit:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: black;\n"
"}\n"
"\n"
"QComboBox {\n"
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
"QScrollBar {\n"
"    background: none;\n"
"    border: none;\n"
"}\n"
"\n"
"QScrollBar::handle {\n"
"    border-radius: 5px;\n"
"     border: 2px solid #777777;\n"
"    background-color: gray;\n"
"}\n"
"\n"
"QScrollBar::add-page{ \n"
"    border: none;\n"
"    background: none;\n"
"}\n"
"\n"
"QScrollBar::sub-page {\n"
"    background: none;\n"
"    border: none;\n"
"    max-width: 5px;\n"
"}\n"
"\n"
"QScrollBar::add-line {\n"
"    border: none;\n"
"    background: none;\n"
"}\n"
"\n"
"QScrollBar::sub-line {\n"
"    border: none;\n"
"    background: none;\n"
"}\n"
"\n"
"QScrollBar:arrow{\n"
"    border: none;\n"
"    background: none;\n"
"    color: none;\n"
"}\n"
"\n"
"")
        self.centralwidget = QtGui.QWidget(MainWindow)
        self.centralwidget.setObjectName("centralwidget")
        self.gridLayout = QtGui.QGridLayout(self.centralwidget)
        self.gridLayout.setContentsMargins(-1, 0, -1, -1)
        self.gridLayout.setObjectName("gridLayout")
        self.loading_label = QtGui.QLabel(self.centralwidget)
        self.loading_label.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTrailing|QtCore.Qt.AlignVCenter)
        self.loading_label.setObjectName("loading_label")
        self.gridLayout.addWidget(self.loading_label, 5, 0, 1, 1)
        self.progressBar = QtGui.QProgressBar(self.centralwidget)
        self.progressBar.setStyleSheet("QProgressBar {\n"
"    background: transparent;\n"
"    border-style: none;\n"
"    max-height: 10px;\n"
"}\n"
"\n"
"QProgressBar::chunk{\n"
"    background-color: #05B8CC;\n"
"    border-radius: 4px;\n"
"}")
        self.progressBar.setProperty("value", 24)
        self.progressBar.setFormat("")
        self.progressBar.setObjectName("progressBar")
        self.gridLayout.addWidget(self.progressBar, 4, 0, 1, 1)
        self.line_bottom = QtGui.QFrame(self.centralwidget)
        self.line_bottom.setFrameShape(QtGui.QFrame.HLine)
        self.line_bottom.setFrameShadow(QtGui.QFrame.Sunken)
        self.line_bottom.setObjectName("line_bottom")
        self.gridLayout.addWidget(self.line_bottom, 3, 0, 1, 1)
        self.mainFrame = QtGui.QFrame(self.centralwidget)
        self.mainFrame.setFrameShape(QtGui.QFrame.StyledPanel)
        self.mainFrame.setFrameShadow(QtGui.QFrame.Raised)
        self.mainFrame.setObjectName("mainFrame")
        self.gridLayout_2 = QtGui.QGridLayout(self.mainFrame)
        self.gridLayout_2.setContentsMargins(0, 0, 0, 0)
        self.gridLayout_2.setObjectName("gridLayout_2")
        self.page_frame = QtGui.QFrame(self.mainFrame)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.page_frame.sizePolicy().hasHeightForWidth())
        self.page_frame.setSizePolicy(sizePolicy)
        self.page_frame.setStyleSheet("")
        self.page_frame.setFrameShape(QtGui.QFrame.NoFrame)
        self.page_frame.setFrameShadow(QtGui.QFrame.Sunken)
        self.page_frame.setObjectName("page_frame")
        self.gridLayout_4 = QtGui.QGridLayout(self.page_frame)
        self.gridLayout_4.setContentsMargins(0, 0, 0, 0)
        self.gridLayout_4.setObjectName("gridLayout_4")
        self.frame_header = QtGui.QFrame(self.page_frame)
        font = QtGui.QFont()
        font.setPointSize(8)
        self.frame_header.setFont(font)
        self.frame_header.setFrameShape(QtGui.QFrame.StyledPanel)
        self.frame_header.setFrameShadow(QtGui.QFrame.Raised)
        self.frame_header.setObjectName("frame_header")
        self.horizontalLayout = QtGui.QHBoxLayout(self.frame_header)
        self.horizontalLayout.setContentsMargins(10, 0, 10, 0)
        self.horizontalLayout.setObjectName("horizontalLayout")
        self.header = QtGui.QLabel(self.frame_header)
        font = QtGui.QFont()
        font.setPointSize(11)
        self.header.setFont(font)
        self.header.setLayoutDirection(QtCore.Qt.LeftToRight)
        self.header.setAlignment(QtCore.Qt.AlignLeading|QtCore.Qt.AlignLeft|QtCore.Qt.AlignVCenter)
        self.header.setObjectName("header")
        self.horizontalLayout.addWidget(self.header)
        self.proj_logo_label = QtGui.QLabel(self.frame_header)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.proj_logo_label.sizePolicy().hasHeightForWidth())
        self.proj_logo_label.setSizePolicy(sizePolicy)
        self.proj_logo_label.setMinimumSize(QtCore.QSize(129, 49))
        self.proj_logo_label.setMaximumSize(QtCore.QSize(130, 50))
        self.proj_logo_label.setText("")
        self.proj_logo_label.setScaledContents(True)
        self.proj_logo_label.setObjectName("proj_logo_label")
        self.horizontalLayout.addWidget(self.proj_logo_label)
        self.gridLayout_4.addWidget(self.frame_header, 0, 0, 1, 1)
        self.area_frame = QtGui.QFrame(self.page_frame)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Expanding)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.area_frame.sizePolicy().hasHeightForWidth())
        self.area_frame.setSizePolicy(sizePolicy)
        self.area_frame.setStyleSheet("")
        self.area_frame.setFrameShape(QtGui.QFrame.StyledPanel)
        self.area_frame.setFrameShadow(QtGui.QFrame.Raised)
        self.area_frame.setObjectName("area_frame")
        self.gridLayout_5 = QtGui.QGridLayout(self.area_frame)
        self.gridLayout_5.setObjectName("gridLayout_5")
        self.login_widget = QtGui.QWidget(self.area_frame)
        self.login_widget.setObjectName("login_widget")
        self.formLayout = QtGui.QFormLayout(self.login_widget)
        self.formLayout.setContentsMargins(0, 0, 0, 0)
        self.formLayout.setObjectName("formLayout")
        self.username_title = QtGui.QLabel(self.login_widget)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.username_title.sizePolicy().hasHeightForWidth())
        self.username_title.setSizePolicy(sizePolicy)
        self.username_title.setObjectName("username_title")
        self.formLayout.setWidget(0, QtGui.QFormLayout.LabelRole, self.username_title)
        self.username_line = QtGui.QLineEdit(self.login_widget)
        self.username_line.setObjectName("username_line")
        self.formLayout.setWidget(0, QtGui.QFormLayout.FieldRole, self.username_line)
        self.server_title_label = QtGui.QLabel(self.login_widget)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.server_title_label.sizePolicy().hasHeightForWidth())
        self.server_title_label.setSizePolicy(sizePolicy)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.server_title_label.setFont(font)
        self.server_title_label.setObjectName("server_title_label")
        self.formLayout.setWidget(1, QtGui.QFormLayout.LabelRole, self.server_title_label)
        self.server_login_label = QtGui.QLabel(self.login_widget)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.server_login_label.sizePolicy().hasHeightForWidth())
        self.server_login_label.setSizePolicy(sizePolicy)
        self.server_login_label.setObjectName("server_login_label")
        self.formLayout.setWidget(2, QtGui.QFormLayout.LabelRole, self.server_login_label)
        self.server_login_line = QtGui.QLineEdit(self.login_widget)
        self.server_login_line.setPlaceholderText("")
        self.server_login_line.setObjectName("server_login_line")
        self.formLayout.setWidget(2, QtGui.QFormLayout.FieldRole, self.server_login_line)
        self.server_pw_label = QtGui.QLabel(self.login_widget)
        self.server_pw_label.setObjectName("server_pw_label")
        self.formLayout.setWidget(3, QtGui.QFormLayout.LabelRole, self.server_pw_label)
        self.horizontalLayout_4 = QtGui.QHBoxLayout()
        self.horizontalLayout_4.setObjectName("horizontalLayout_4")
        self.server_pw_line = QtGui.QLineEdit(self.login_widget)
        self.server_pw_line.setInputMethodHints(QtCore.Qt.ImhHiddenText|QtCore.Qt.ImhNoAutoUppercase|QtCore.Qt.ImhNoPredictiveText)
        self.server_pw_line.setEchoMode(QtGui.QLineEdit.Password)
        self.server_pw_line.setPlaceholderText("")
        self.server_pw_line.setObjectName("server_pw_line")
        self.horizontalLayout_4.addWidget(self.server_pw_line)
        self.view_pw_button = QtGui.QPushButton(self.login_widget)
        self.view_pw_button.setEnabled(True)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.view_pw_button.sizePolicy().hasHeightForWidth())
        self.view_pw_button.setSizePolicy(sizePolicy)
        self.view_pw_button.setMinimumSize(QtCore.QSize(30, 30))
        self.view_pw_button.setMaximumSize(QtCore.QSize(40, 40))
        self.view_pw_button.setStyleSheet("QPushButton {\n"
"    background: none;\n"
"    border: 2px solid #666666;\n"
"    border-radius: 5px;    \n"
"}\n"
"\n"
"QPushButton:hover {\n"
"    background-color: #777777;\n"
"    border: none;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    background-color: rgb(90, 90, 90);\n"
"    border-top: 2px solid #444444;\n"
"    border-left: 2px solid #444444;\n"
"    border-bottom: none;\n"
"    border-right: none;\n"
"}\n"
"")
        self.view_pw_button.setText("")
        self.view_pw_button.setObjectName("view_pw_button")
        self.horizontalLayout_4.addWidget(self.view_pw_button)
        self.formLayout.setLayout(3, QtGui.QFormLayout.FieldRole, self.horizontalLayout_4)
        self.status_label = QtGui.QLabel(self.login_widget)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.status_label.setFont(font)
        self.status_label.setStyleSheet("color: white;")
        self.status_label.setFrameShape(QtGui.QFrame.Box)
        self.status_label.setObjectName("status_label")
        self.formLayout.setWidget(4, QtGui.QFormLayout.LabelRole, self.status_label)
        self.test_login_button = QtGui.QPushButton(self.login_widget)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.test_login_button.setFont(font)
        self.test_login_button.setStyleSheet("QPushButton {\n"
"    color: #333333;\n"
"    border: 2px solid lightgray;\n"
"    border-radius: 6px;\n"
"    background-color: gray;\n"
"    min-height: 20px;\n"
"    min-width: 60px;\n"
"}\n"
"QPushButton:pressed {\n"
"    color: lightgray;\n"
"    border: 2px solid #333333;\n"
"    background-color: #05B8CC;\n"
"    font-size: 7pt;\n"
"}\n"
"QPushButton:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: #111111;\n"
"}\n"
"\n"
"QPushButton:!enabled {\n"
"    color: #444444;\n"
"    background-color: #999999;\n"
"    border-color: #777777;\n"
"}\n"
"")
        self.test_login_button.setObjectName("test_login_button")
        self.formLayout.setWidget(4, QtGui.QFormLayout.FieldRole, self.test_login_button)
        spacerItem = QtGui.QSpacerItem(40, 10, QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Minimum)
        self.formLayout.setItem(5, QtGui.QFormLayout.FieldRole, spacerItem)
        self.label_4 = QtGui.QLabel(self.login_widget)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.label_4.setFont(font)
        self.label_4.setObjectName("label_4")
        self.formLayout.setWidget(6, QtGui.QFormLayout.LabelRole, self.label_4)
        self.local_folder_label = QtGui.QLabel(self.login_widget)
        self.local_folder_label.setObjectName("local_folder_label")
        self.formLayout.setWidget(7, QtGui.QFormLayout.LabelRole, self.local_folder_label)
        self.horizontalLayout_3 = QtGui.QHBoxLayout()
        self.horizontalLayout_3.setObjectName("horizontalLayout_3")
        self.localFolder_line = QtGui.QLineEdit(self.login_widget)
        self.localFolder_line.setObjectName("localFolder_line")
        self.horizontalLayout_3.addWidget(self.localFolder_line)
        self.local_folder_button = QtGui.QPushButton(self.login_widget)
        self.local_folder_button.setEnabled(True)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.local_folder_button.sizePolicy().hasHeightForWidth())
        self.local_folder_button.setSizePolicy(sizePolicy)
        self.local_folder_button.setMinimumSize(QtCore.QSize(30, 30))
        self.local_folder_button.setMaximumSize(QtCore.QSize(40, 40))
        self.local_folder_button.setStyleSheet("QPushButton {\n"
"    background: none;\n"
"    border: 2px solid #666666;\n"
"    border-radius: 5px;    \n"
"}\n"
"\n"
"QPushButton:hover {\n"
"    background-color: #777777;\n"
"    border: none;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    background-color: rgb(90, 90, 90);\n"
"    border-top: 2px solid #444444;\n"
"    border-left: 2px solid #444444;\n"
"    border-bottom: none;\n"
"    border-right: none;\n"
"}\n"
"")
        self.local_folder_button.setText("")
        self.local_folder_button.setObjectName("local_folder_button")
        self.horizontalLayout_3.addWidget(self.local_folder_button)
        self.formLayout.setLayout(7, QtGui.QFormLayout.FieldRole, self.horizontalLayout_3)
        self.funcao_label = QtGui.QLabel(self.login_widget)
        self.funcao_label.setObjectName("funcao_label")
        self.formLayout.setWidget(8, QtGui.QFormLayout.LabelRole, self.funcao_label)
        self.combo_funcao = QtGui.QComboBox(self.login_widget)
        self.combo_funcao.setObjectName("combo_funcao")
        self.formLayout.setWidget(8, QtGui.QFormLayout.FieldRole, self.combo_funcao)
        self.label_5 = QtGui.QLabel(self.login_widget)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.label_5.setFont(font)
        self.label_5.setObjectName("label_5")
        self.formLayout.setWidget(9, QtGui.QFormLayout.LabelRole, self.label_5)
        self.harmony_label = QtGui.QLabel(self.login_widget)
        self.harmony_label.setEnabled(True)
        self.harmony_label.setObjectName("harmony_label")
        self.formLayout.setWidget(10, QtGui.QFormLayout.LabelRole, self.harmony_label)
        self.horizontalLayout_2 = QtGui.QHBoxLayout()
        self.horizontalLayout_2.setObjectName("horizontalLayout_2")
        self.harmony_folder_line = QtGui.QLineEdit(self.login_widget)
        self.harmony_folder_line.setEnabled(True)
        self.harmony_folder_line.setText("")
        self.harmony_folder_line.setObjectName("harmony_folder_line")
        self.horizontalLayout_2.addWidget(self.harmony_folder_line)
        self.harmony_folder_button = QtGui.QPushButton(self.login_widget)
        self.harmony_folder_button.setEnabled(True)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.harmony_folder_button.sizePolicy().hasHeightForWidth())
        self.harmony_folder_button.setSizePolicy(sizePolicy)
        self.harmony_folder_button.setMinimumSize(QtCore.QSize(30, 30))
        self.harmony_folder_button.setMaximumSize(QtCore.QSize(40, 40))
        self.harmony_folder_button.setStyleSheet("QPushButton {\n"
"    background: none;\n"
"    border: 2px solid #666666;\n"
"    border-radius: 5px;    \n"
"}\n"
"\n"
"QPushButton:hover {\n"
"    background-color: #777777;\n"
"    border: none;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    background-color: rgb(90, 90, 90);\n"
"    border-top: 2px solid #444444;\n"
"    border-left: 2px solid #444444;\n"
"    border-bottom: none;\n"
"    border-right: none;\n"
"}")
        self.harmony_folder_button.setText("")
        self.harmony_folder_button.setObjectName("harmony_folder_button")
        self.horizontalLayout_2.addWidget(self.harmony_folder_button)
        self.formLayout.setLayout(10, QtGui.QFormLayout.FieldRole, self.horizontalLayout_2)
        spacerItem1 = QtGui.QSpacerItem(20, 130, QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Expanding)
        self.formLayout.setItem(11, QtGui.QFormLayout.FieldRole, spacerItem1)
        self.update_button = QtGui.QPushButton(self.login_widget)
        self.update_button.setEnabled(False)
        font = QtGui.QFont()
        font.setWeight(75)
        font.setBold(True)
        self.update_button.setFont(font)
        self.update_button.setStyleSheet("QPushButton {\n"
"    color: #333333;\n"
"    border: 2px solid lightgray;\n"
"    border-radius: 6px;\n"
"    background-color: gray;\n"
"    min-height: 20px;\n"
"    min-width: 60px;\n"
"}\n"
"QPushButton:pressed {\n"
"    color: lightgray;\n"
"    border: 2px solid #333333;\n"
"    background-color: #05B8CC;\n"
"    font-size: 7pt;\n"
"}\n"
"QPushButton:hover{\n"
"    border: 2px solid #05B8CC;\n"
"    color: #111111;\n"
"}\n"
"\n"
"QPushButton:!enabled {\n"
"    color: #444444;\n"
"    background-color: #999999;\n"
"    border-color: #777777;\n"
"}\n"
"\n"
"")
        self.update_button.setObjectName("update_button")
        self.formLayout.setWidget(12, QtGui.QFormLayout.FieldRole, self.update_button)
        self.gridLayout_5.addWidget(self.login_widget, 0, 0, 1, 1)
        self.gridLayout_4.addWidget(self.area_frame, 1, 0, 1, 1)
        self.gridLayout_2.addWidget(self.page_frame, 1, 0, 1, 1)
        self.gridLayout.addWidget(self.mainFrame, 2, 0, 1, 1)
        self.frame_title = QtGui.QFrame(self.centralwidget)
        self.frame_title.setMaximumSize(QtCore.QSize(16777215, 80))
        self.frame_title.setFrameShape(QtGui.QFrame.StyledPanel)
        self.frame_title.setFrameShadow(QtGui.QFrame.Raised)
        self.frame_title.setObjectName("frame_title")
        self.gridLayout_3 = QtGui.QGridLayout(self.frame_title)
        self.gridLayout_3.setSpacing(0)
        self.gridLayout_3.setContentsMargins(-1, -1, 0, 0)
        self.gridLayout_3.setObjectName("gridLayout_3")
        self.label_title = QtGui.QLabel(self.frame_title)
        font = QtGui.QFont()
        font.setFamily("Times New Roman")
        font.setPointSize(33)
        font.setItalic(False)
        self.label_title.setFont(font)
        self.label_title.setStyleSheet("QLabel {\n"
"    color: #222222;\n"
"}")
        self.label_title.setScaledContents(False)
        self.label_title.setAlignment(QtCore.Qt.AlignRight|QtCore.Qt.AlignTop|QtCore.Qt.AlignTrailing)
        self.label_title.setObjectName("label_title")
        self.gridLayout_3.addWidget(self.label_title, 0, 2, 1, 1)
        self.label_title_app = QtGui.QLabel(self.frame_title)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.label_title_app.sizePolicy().hasHeightForWidth())
        self.label_title_app.setSizePolicy(sizePolicy)
        self.label_title_app.setMaximumSize(QtCore.QSize(70, 16777215))
        font = QtGui.QFont()
        font.setPointSize(20)
        font.setWeight(50)
        font.setBold(False)
        self.label_title_app.setFont(font)
        self.label_title_app.setStyleSheet("QLabel {\n"
"    color: gray;\n"
"}")
        self.label_title_app.setAlignment(QtCore.Qt.AlignBottom|QtCore.Qt.AlignLeading|QtCore.Qt.AlignLeft)
        self.label_title_app.setObjectName("label_title_app")
        self.gridLayout_3.addWidget(self.label_title_app, 0, 3, 1, 1)
        self.home_button = QtGui.QPushButton(self.frame_title)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.home_button.sizePolicy().hasHeightForWidth())
        self.home_button.setSizePolicy(sizePolicy)
        self.home_button.setMinimumSize(QtCore.QSize(60, 60))
        self.home_button.setMaximumSize(QtCore.QSize(61, 61))
        self.home_button.setStyleSheet("QPushButton {\n"
"    border: none;\n"
"    border-radius: 30px;\n"
"}\n"
"\n"
"QPushButton:hover {\n"
"    background-color: #05B8CC;\n"
"}\n"
"\n"
"QPushButton:pressed {\n"
"    background-color: rgb(255, 78, 125);\n"
"}")
        self.home_button.setText("")
        self.home_button.setIconSize(QtCore.QSize(59, 59))
        self.home_button.setObjectName("home_button")
        self.gridLayout_3.addWidget(self.home_button, 0, 0, 1, 1)
        spacerItem2 = QtGui.QSpacerItem(40, 40, QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Preferred)
        self.gridLayout_3.addItem(spacerItem2, 0, 1, 1, 1)
        spacerItem3 = QtGui.QSpacerItem(40, 40, QtGui.QSizePolicy.Minimum, QtGui.QSizePolicy.Preferred)
        self.gridLayout_3.addItem(spacerItem3, 0, 4, 1, 1)
        self.label_version = QtGui.QLabel(self.frame_title)
        self.label_version.setStyleSheet("color: gray;")
        self.label_version.setAlignment(QtCore.Qt.AlignBottom|QtCore.Qt.AlignLeading|QtCore.Qt.AlignLeft)
        self.label_version.setObjectName("label_version")
        self.gridLayout_3.addWidget(self.label_version, 0, 5, 1, 1)
        self.gridLayout.addWidget(self.frame_title, 0, 0, 1, 1)
        self.line_title = QtGui.QFrame(self.centralwidget)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Preferred, QtGui.QSizePolicy.Preferred)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.line_title.sizePolicy().hasHeightForWidth())
        self.line_title.setSizePolicy(sizePolicy)
        self.line_title.setFrameShape(QtGui.QFrame.HLine)
        self.line_title.setFrameShadow(QtGui.QFrame.Sunken)
        self.line_title.setObjectName("line_title")
        self.gridLayout.addWidget(self.line_title, 1, 0, 1, 1)
        MainWindow.setCentralWidget(self.centralwidget)
        self.menuBar = QtGui.QMenuBar(MainWindow)
        self.menuBar.setGeometry(QtCore.QRect(0, 0, 444, 26))
        self.menuBar.setObjectName("menuBar")
        self.menu = QtGui.QMenu(self.menuBar)
        self.menu.setObjectName("menu")
        MainWindow.setMenuBar(self.menuBar)
        self.actionChange_User = QtGui.QAction(MainWindow)
        self.actionChange_User.setObjectName("actionChange_User")
        self.actionCheck_Updates = QtGui.QAction(MainWindow)
        self.actionCheck_Updates.setObjectName("actionCheck_Updates")
        self.actionCredits = QtGui.QAction(MainWindow)
        self.actionCredits.setObjectName("actionCredits")
        self.actionExit = QtGui.QAction(MainWindow)
        self.actionExit.setObjectName("actionExit")
        self.menu.addSeparator()
        self.menu.addAction(self.actionChange_User)
        self.menu.addAction(self.actionCheck_Updates)
        self.menu.addAction(self.actionCredits)
        self.menu.addSeparator()
        self.menu.addAction(self.actionExit)
        self.menuBar.addAction(self.menu.menuAction())

        self.retranslateUi(MainWindow)
        QtCore.QMetaObject.connectSlotsByName(MainWindow)

    def retranslateUi(self, MainWindow):
        MainWindow.setWindowTitle(QtGui.QApplication.translate("MainWindow", "BirdoApp", None, QtGui.QApplication.UnicodeUTF8))
        self.loading_label.setText(QtGui.QApplication.translate("MainWindow", "loading label...", None, QtGui.QApplication.UnicodeUTF8))
        self.header.setText(QtGui.QApplication.translate("MainWindow", "PROJETO:", None, QtGui.QApplication.UnicodeUTF8))
        self.username_title.setText(QtGui.QApplication.translate("MainWindow", "User Name:", None, QtGui.QApplication.UnicodeUTF8))
        self.username_line.setToolTip(QtGui.QApplication.translate("MainWindow", "Escolha um nome usuario que todos te reconhecam!", None, QtGui.QApplication.UnicodeUTF8))
        self.username_line.setPlaceholderText(QtGui.QApplication.translate("MainWindow", "Choose User Name ", None, QtGui.QApplication.UnicodeUTF8))
        self.server_title_label.setText(QtGui.QApplication.translate("MainWindow", "Server Login:", None, QtGui.QApplication.UnicodeUTF8))
        self.server_login_label.setText(QtGui.QApplication.translate("MainWindow", "Login:", None, QtGui.QApplication.UnicodeUTF8))
        self.server_login_line.setToolTip(QtGui.QApplication.translate("MainWindow", "login do server", None, QtGui.QApplication.UnicodeUTF8))
        self.server_pw_label.setText(QtGui.QApplication.translate("MainWindow", "Password:", None, QtGui.QApplication.UnicodeUTF8))
        self.server_pw_line.setToolTip(QtGui.QApplication.translate("MainWindow", "senha do server", None, QtGui.QApplication.UnicodeUTF8))
        self.view_pw_button.setToolTip(QtGui.QApplication.translate("MainWindow", "<html><head/><body><p>show password</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.status_label.setToolTip(QtGui.QApplication.translate("MainWindow", "status do teste de conexao com o servidor", None, QtGui.QApplication.UnicodeUTF8))
        self.status_label.setText(QtGui.QApplication.translate("MainWindow", "TEST LOGIN =>", None, QtGui.QApplication.UnicodeUTF8))
        self.test_login_button.setText(QtGui.QApplication.translate("MainWindow", "Test Connection", None, QtGui.QApplication.UnicodeUTF8))
        self.label_4.setText(QtGui.QApplication.translate("MainWindow", "Project Info:", None, QtGui.QApplication.UnicodeUTF8))
        self.local_folder_label.setText(QtGui.QApplication.translate("MainWindow", "Local Folder:", None, QtGui.QApplication.UnicodeUTF8))
        self.localFolder_line.setToolTip(QtGui.QApplication.translate("MainWindow", "Folder local do projeto\n"
"\n"
"Atencao! Se vc usa o Nexcloud Client, nao escolha o mesmo folder local escolhido para o client!", None, QtGui.QApplication.UnicodeUTF8))
        self.localFolder_line.setPlaceholderText(QtGui.QApplication.translate("MainWindow", "Folder Local do Projeto...", None, QtGui.QApplication.UnicodeUTF8))
        self.local_folder_button.setToolTip(QtGui.QApplication.translate("MainWindow", "<html><head/><body><p>Escolhe o folder local do projeto</p><p>OBS: Nao ecolha o mesmo folder do client do Nextcloud!</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.funcao_label.setText(QtGui.QApplication.translate("MainWindow", "Funcao no Projeto:", None, QtGui.QApplication.UnicodeUTF8))
        self.combo_funcao.setToolTip(QtGui.QApplication.translate("MainWindow", "<html><head/><body><p>Escolha a sua funcao no projeto</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.label_5.setText(QtGui.QApplication.translate("MainWindow", "Software Info:", None, QtGui.QApplication.UnicodeUTF8))
        self.harmony_label.setText(QtGui.QApplication.translate("MainWindow", "Harmony folder:", None, QtGui.QApplication.UnicodeUTF8))
        self.harmony_folder_line.setToolTip(QtGui.QApplication.translate("MainWindow", "Ecolha o folder da instalacao NAO padrao do HARMONY:\n"
"EX: Escolha a pasta com o nome de:\n"
"\'Toon Boom Harmony 20 Premium\' para a versao 20", None, QtGui.QApplication.UnicodeUTF8))
        self.harmony_folder_line.setPlaceholderText(QtGui.QApplication.translate("MainWindow", "Harmony Installation Folder...", None, QtGui.QApplication.UnicodeUTF8))
        self.harmony_folder_button.setToolTip(QtGui.QApplication.translate("MainWindow", "<html><head/><body><p>Caso o Harmony esteja instalado num folder NAO padrao, informe o folder da instalacao!</p></body></html>", None, QtGui.QApplication.UnicodeUTF8))
        self.update_button.setText(QtGui.QApplication.translate("MainWindow", "Update", None, QtGui.QApplication.UnicodeUTF8))
        self.label_title.setText(QtGui.QApplication.translate("MainWindow", "birdo", None, QtGui.QApplication.UnicodeUTF8))
        self.label_title_app.setText(QtGui.QApplication.translate("MainWindow", "app", None, QtGui.QApplication.UnicodeUTF8))
        self.home_button.setToolTip(QtGui.QApplication.translate("MainWindow", "Home...\n"
"\n"
"Volta para pagina de escolher os projetos!", None, QtGui.QApplication.UnicodeUTF8))
        self.label_version.setText(QtGui.QApplication.translate("MainWindow", "v.1.0", None, QtGui.QApplication.UnicodeUTF8))
        self.menu.setTitle(QtGui.QApplication.translate("MainWindow", "|||", None, QtGui.QApplication.UnicodeUTF8))
        self.actionChange_User.setText(QtGui.QApplication.translate("MainWindow", "Change User", None, QtGui.QApplication.UnicodeUTF8))
        self.actionCheck_Updates.setText(QtGui.QApplication.translate("MainWindow", "Check Updates", None, QtGui.QApplication.UnicodeUTF8))
        self.actionCredits.setText(QtGui.QApplication.translate("MainWindow", "Credits...", None, QtGui.QApplication.UnicodeUTF8))
        self.actionExit.setText(QtGui.QApplication.translate("MainWindow", "Exit", None, QtGui.QApplication.UnicodeUTF8))


if __name__ == "__main__":
    import sys
    app = QtGui.QApplication(sys.argv)
    MainWindow = QtGui.QMainWindow()
    ui = Ui_MainWindow()
    ui.setupUi(MainWindow)
    MainWindow.show()
    sys.exit(app.exec_())

