# -*- coding: utf-8 -*-
import re
import io
from PySide.QtGui import QDialog, QTextEdit, QVBoxLayout, QApplication, QIcon
from birdo_pathlib import Path
import os
import sys
import argparse
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


def convert_markdown(markdown_text):
    """convert markdown text into rich text"""
    regexes = [
        (r"{0}.+{1}", (r"\*\*", r"\*\*"), ("<b>", r"</b>"), None),
        (r"{0}.+{1}", (r"__", r"__"), ("<b>", r"</b>"), None),
        (r"{0}.+{1}", (r"\*", r"\*"), ("<i>", r"</i>"), None),
        (r"{0}.+{1}", (r"_", r"_"), ("<i>", r"</i>"), None),
        (r"{0}+\s.+{1}", (r"#", ""), ("<h{0}>", r"</h{0}>"), "#"),
        (r"{0}.+{1}", (r"\s+-", ""), ("<ul>-", r"</ul>"), None),
        (r"{0}.+{1}", (r"~~", "~~"), ("<u>", r"</u>"), None)
    ]
    richtext = markdown_text
    for item in regexes:
        r = item[0].format(item[1][0], item[1][1])
        matches = re.findall(r, richtext)
        for m in matches:
            if item[-1]:
                sr = (item[2][0].format(m.count(item[-1])), item[2][1].format(m.count(item[-1])))
            else:
                sr = (item[2][0], item[2][1])
            f = u"{0}{1}{2}".format(sr[0], re.sub(item[1][0], "", m), sr[1])
            richtext = richtext.replace(m, f)
    return richtext


class About(QDialog):
    def __init__(self, birdoapp, parent=None):
        super(About, self).__init__(parent=parent)
        self.app = birdoapp
        self.setWindowTitle(self.app.data["name"])
        self.setGeometry(100, 100, 600, 400)

        # create text widget
        self.layout = QVBoxLayout()
        self.text_edit = QTextEdit(self)
        self.layout.addWidget(self.text_edit)
        self.setLayout(self.layout)
        self.text_edit.setAcceptRichText(True)
        self.text_edit.setReadOnly(True)

        # md files data creditos
        self.creditos_md = Path(self.app.root) / "CREDITOS.md"
        with io.open(self.creditos_md.path, 'r', encoding="utf-8") as f:
            t = convert_markdown(f.read())
        self.credits_rt = u'<h1>Créditos</h1><ul>- {0}</ul><h1>Release</h1><ul>- {1} ({2})</ul>{3}'.format(
            self.app.data['credits'],
            self.app.data['release_notes'],
            self.app.data['release_date'],
            t
        )

        # md files data terms
        self.terms_md = Path(self.app.root) / "TERMS.md"
        with io.open(self.terms_md.path, 'r', encoding="utf-8") as f:
            self.terms_rt = convert_markdown(f.read())

    def show_terms(self):
        self.text_edit.setHtml(self.terms_rt)
        self.show()

    def show_credits(self):
        self.text_edit.setHtml(self.credits_rt)
        self.show()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Birdoapp About')
    parser.add_argument("action", type=str, choices=["terms", "credits"],
                        help="Choose action. Options are: terms (to display terms information) "
                             "credits (to display credits information)")

    args = parser.parse_args()

    # arguments
    action = args.action

    # perform action
    app = QApplication([])

    # config class
    birdoapp = ConfigInit()
    d = About(birdoapp)
    d.setWindowIcon(QIcon(birdoapp.icons["logo"]))
    if action == "terms":
        d.show_terms()
    elif action == "credits":
        d.show_credits()

    sys.exit(app.exec_())
