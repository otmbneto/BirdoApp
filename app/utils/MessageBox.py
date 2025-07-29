# -*- coding: utf-8 -*-
import os
import sys
from PySide.QtGui import*
from PySide import QtCore


class CreateMessageBox:
    """Class that creates a MessageBox Object"""
    def __init__(self):
        try:
            self.app = QApplication(sys.argv)
            self.loop = False
        except:
            self.app = QApplication.instance()
            self.loop = True
        self.msg = QMessageBox()
        self.msg.setWindowTitle("BirdoApp")
        self.birdoLogo = os.path.join(os.path.dirname(__file__).replace('utils', 'icons'), 'logo.png') #pega o caminho do png icon da birdo
        self.msg.setWindowIcon(QIcon(self.birdoLogo))
        self.msg.setStyleSheet("QWidget{\nbackground: rgb(91, 91, 91);\n}QLabel {\ncolor: lightgray;\n}QPushButton {\n	color: #444444;\nborder: 2px solid white;\nborder-radius: 6px;\nbackground-color: rgb(180, 180, 180);\n	min-height: 25px;\n	min-width: 80px;\n}\nQPushButton:pressed {\ncolor: white;\nborder: 2px solid darkblue;\nbackground-color: #05B8CC;\nfont-size: 7pt;\n}\nQPushButton:hover{\nborder: 2px solid #05B8CC;\ncolor: black;\n}\n")
        self.msg.setWindowFlags(QtCore.Qt.WindowStaysOnTopHint)

    def information(self, text):
        print text
        self.msg.setText(text)
        self.msg.setIcon(QMessageBox.Information)
        self.msg.setStandardButtons(QMessageBox.Ok)
        self.msg.show()
        if not self.loop:
            self.app.exec_()

    def warning(self, text):
        print text
        self.msg.setText(text)
        self.msg.setIcon(QMessageBox.Warning)
        self.msg.setStandardButtons(QMessageBox.Ok)
        self.msg.show()
        if not self.loop:
            self.app.exec_()

    def question(self, text):
        print text
        self.msg.setText(text)
        self.msg.setIcon(QMessageBox.Question)
        self.msg.setStandardButtons(QMessageBox.Yes | QMessageBox.No)
        self.msg.show()
        return self.msg.exec_() != 65536

    def critical(self, text):
        print text
        self.msg.setText(text)
        self.msg.setIcon(QMessageBox.Critical)
        self.msg.setStandardButtons(QMessageBox.Ok)
        self.msg.show()
        if not self.loop:
            self.app.exec_()