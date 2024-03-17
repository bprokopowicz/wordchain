class Command:
    QUIT = 1
    PLAY = 2
    SOLVE =3

    def askForCommand():
        while (1):
            line = input("play, solve, or quit: ").strip()
            if (line == "play"):
                return Command.PLAY
            if (line == "quit"):
                return Command.QUIT
            if (line == "solve"):
                return Command.SOLVE

