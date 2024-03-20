import os
import sys
import unittest

class TestBase(unittest.TestCase):
    @staticmethod
    def main(fileName):

        className = os.path.splitext(os.path.basename(fileName))[0]

        for index, arg in enumerate(sys.argv):
            if index == 0:
                continue

            if ".test_" in arg:
                sys.argv[index] = arg
            elif "test_" in arg:
                sys.argv[index] = "{}.{}".format(className, arg)
            else:
                sys.argv[index] = "{}.test_{}".format(className, arg)
                
        return unittest.main()
