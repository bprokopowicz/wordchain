import os

GL_DTAGS = os.getenv("DTAGS")

class GenericBaseClass(object):
    debugTags = set(GL_DTAGS.split(",")) if GL_DTAGS else set()

    @staticmethod
    def logDebug(msg, tags):
        tagSet = set(tags.split(",")) if tags else set()
        if GenericBaseClass.debugTags & tagSet:
            print("DEBUG: {}".format(msg))
