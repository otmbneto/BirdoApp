import string


class PswEncDec:
    """decodificador e enc de strings"""
    def __init__(self):
        self.allChars = string.ascii_letters + " " + str(string.digits) + string.punctuation

    def enc(self, toenc):
        enc = ""
        i = len(toenc)
        for l in toenc:
            new_i = self.allChars.index(l) - (i*2)
            while new_i < 0:
                new_i += len(self.allChars)
            enc += str(self.allChars[new_i])
            i -= 1
        return enc

    def dec(self, todec):
        dec = ""
        i = len(todec)
        for l in todec:
            new_i = self.allChars.index(l) + (i*2)
            while new_i >= len(self.allChars):
                new_i -= len(self.allChars)
            dec += str(self.allChars[new_i])
            i -= 1
        return dec