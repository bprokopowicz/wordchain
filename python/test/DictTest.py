import os
import sys
import unittest

sys.path.insert(0, "../src")

from TestBase import *
from WordSeqDict import *

class DictTest(TestBase):
    @classmethod
    def setUpClass(cls):
        cls.tinyDict  = WordSeqDict(["apple", "pear", "banana"])
        smallList = ["bad", "bade", "bald", "bat", "bate", "bid", "cad", "cat", "dog", "scad"]
        cls.miniDict  = WordSeqDict(smallList, 3)
        cls.smallDict = WordSeqDict(smallList)
        cls.fullDict  = WordSeqDict()

    ################
    # tinyDict tests
    ################

    def test_simpleCustomDict(self):
        self.assertEqual(self.tinyDict.getSize(), 3, "Size is wrong")
        self.assertTrue(self.tinyDict.isWord("apple"), "'apple' is a word")
        self.assertTrue(self.tinyDict.isWord("apPle"), "'apPle' is a word")
        self.assertFalse(self.tinyDict.isWord("peach"), "'peach' is NOT a word")

    ################
    # fullDict tests
    ################

    def test_dictLoads(self):
        self.assertEqual(self.fullDict.getSize(), 279369, "Size is wrong")

    def test_isWord(self):
        self.assertTrue(self.fullDict.isWord("place"), "'place' actually is a word")
        self.assertTrue(self.fullDict.isWord("PlAcE"), "'PlAcE' actually is a word")

    def test_isNotWord(self):
        self.assertFalse(self.fullDict.isWord("zizzamatizzateezyman"), "'zizzamatizzateezyman' is NOT a word")

    def test_adder(self):
        adders = self.fullDict.findAdderWords("cat")
        self.assertEqual(len(adders), 10, "Expected 10 adders")

    def test_replacement(self):
        replacements = self.fullDict.findReplacementWords("bade")
        self.assertEqual(len(replacements), 24, "Expected 24 replacements")

    #################
    # smallDict tests
    #################

    def test_adderBeginning(self):
        adders = self.smallDict.findAdderWords("cad")
        self.assertIn("scad", adders, "'scad' is not in adders")

    def test_adderMiddle(self):
        adders = self.smallDict.findAdderWords("bad")
        self.assertIn("bald", adders, "'bald' is not in adders")

    def test_adderEnd(self):
        adders = self.smallDict.findAdderWords("bat")
        self.assertIn("bate", adders, "'bate' is not in adders")

    def test_removerBeginning(self):
        removers = self.smallDict.findRemoverWords("ccad")
        self.assertIn("cad", removers, "'cad' is not in removers")

    def test_removerMiddle(self):
        removers = self.smallDict.findRemoverWords("bald")
        self.assertIn("bad", removers, "'bad' is not in removers")

    def test_removerEnd(self):
        removers = self.smallDict.findRemoverWords("bate")
        self.assertIn("bat", removers, "'bat' is not in removers")

    def test_replacementBeginning(self):
        replacements = self.smallDict.findReplacementWords("bad")
        self.assertIn("bid", replacements, "'bid' is not in replacements")

    def test_replacementMiddle(self):
        replacements = self.smallDict.findReplacementWords("cad")
        self.assertIn("bad", replacements, "'bad' is not in replacements")

    def test_replacementEnd(self):
        replacements = self.smallDict.findReplacementWords("bad")
        self.assertIn("bat", replacements, "'bat' is not in replacements")

    def test_lengthFilter(self):
        self.assertEqual(self.miniDict.getSize(), 6, "Size is wrong")


if __name__ == '__main__':
    TestBase.main(__file__.replace(".py", ""))
