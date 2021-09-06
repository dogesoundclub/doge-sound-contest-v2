import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import DogeSoundClubMateArtifact from "../artifacts/contracts/DogeSoundClubMate.sol/DogeSoundClubMate.json";
import DogeSoundContestV2Artifact from "../artifacts/contracts/DogeSoundContestV2.sol/DogeSoundContestV2.json";
import DogeSoundsWinnersArtifact from "../artifacts/contracts/DogeSoundsWinners.sol/DogeSoundsWinners.json";
import { DogeSoundsWinners } from "../typechain";
import { DogeSoundClubMate } from "../typechain/DogeSoundClubMate";
import { DogeSoundContestV2 } from "../typechain/DogeSoundContestV2";

const { deployContract } = waffle;

async function mine(count = 1): Promise<void> {
    expect(count).to.be.gt(0);
    for (let i = 0; i < count; i += 1) {
        await ethers.provider.send("evm_mine", []);
    }
}

describe("DogeSoundContestV2", () => {
    let mates1: DogeSoundClubMate;
    let mates2: DogeSoundClubMate;
    let winners: DogeSoundsWinners;
    let contest: DogeSoundContestV2;

    const provider = waffle.provider;
    const [admin, other] = provider.getWallets();

    beforeEach(async () => {

        mates1 = await deployContract(
            admin,
            DogeSoundClubMateArtifact,
            []
        ) as DogeSoundClubMate;

        mates2 = await deployContract(
            admin,
            DogeSoundClubMateArtifact,
            []
        ) as DogeSoundClubMate;

        winners = await deployContract(
            admin,
            DogeSoundsWinnersArtifact,
            []
        ) as DogeSoundsWinners;

        contest = await deployContract(
            admin,
            DogeSoundContestV2Artifact,
            [await provider.getBlockNumber(), winners.address]
        ) as DogeSoundContestV2;

        await contest.allowMates(mates1.address);
        await contest.allowMates(mates2.address);
        await winners.addMinter(contest.address);
    })

    context("new DogeSoundContestV2", async () => {
        it("has given data", async () => {
            expect(await contest.HOLIDAY_PERIOD()).to.be.equal(0)
            expect(await contest.REGISTER_CANDIDATE_PERIOD()).to.be.equal(1)
            expect(await contest.VOTE_PERIOD()).to.be.equal(2)
        })

        it("set period", async () => {
            await contest.setHolidayInterval(20);
            await contest.setCandidateInterval(20);
            await contest.setVoteInterval(20);

            expect(await contest.round()).to.be.equal(0)

            await network.provider.send("evm_setAutomine", [false]);
            await mine(60);
            await network.provider.send("evm_setAutomine", [true]);

            expect(await contest.round()).to.be.equal(1)

            await contest.setHolidayInterval(20);
            await contest.setCandidateInterval(20);
            await contest.setVoteInterval(20);

            await network.provider.send("evm_setAutomine", [false]);
            await mine(60);
            await network.provider.send("evm_setAutomine", [true]);

            expect(await contest.round()).to.be.equal(2)

            await network.provider.send("evm_setAutomine", [false]);
            for (let i = 3; i <= 10; i += 1) {
                await mine(60);
                expect(await contest.round()).to.be.equal(i)
            }
            await network.provider.send("evm_setAutomine", [true]);

            await contest.setHolidayInterval(60);
            await contest.setCandidateInterval(60);
            await contest.setVoteInterval(60);

            await network.provider.send("evm_setAutomine", [false]);
            await mine(180);
            await network.provider.send("evm_setAutomine", [true]);

            expect(await contest.round()).to.be.equal(11)
        })

        it("register candidate", async () => {

            for (let i = 0; i < 10; i += 1) {
                await mates1.mint(admin.address, i);
            }

            await contest.setHolidayInterval(20);
            await contest.setCandidateInterval(20);
            await contest.setVoteInterval(20);

            await network.provider.send("evm_setAutomine", [false]);
            await mine(20);
            await network.provider.send("evm_setAutomine", [true]);

            await contest.registerCandidate("도지사운드클럽", mates1.address, [0, 1, 2, 3, 4]);
            expect(await contest.candidateCount(0)).to.be.equal(1)
            expect(await contest.candidate(0, 0)).to.be.equal("도지사운드클럽")

            await contest.registerCandidate("최고야!", mates1.address, [5, 6, 7, 8, 9]);
            expect(await contest.candidateCount(0)).to.be.equal(2)
            expect(await contest.candidate(0, 1)).to.be.equal("최고야!")
        })

        it("vote", async () => {

            await mates1.addMinter(other.address);

            for (let i = 0; i < 15; i += 1) {
                await mates1.mint(admin.address, i);
            }

            for (let i = 15; i < 25; i += 1) {
                await mates1.mint(other.address, i);
            }

            await contest.setHolidayInterval(20);
            await contest.setCandidateInterval(20);
            await contest.setVoteInterval(20);

            await contest.registerCandidate("도지사운드클럽", mates1.address, [0, 1, 2, 3, 4]);
            expect(await contest.candidateCount(0)).to.be.equal(1)
            expect(await contest.candidate(0, 0)).to.be.equal("도지사운드클럽")

            await contest.registerCandidate("최고야!", mates1.address, [5, 6, 7, 8, 9]);
            expect(await contest.candidateCount(0)).to.be.equal(2)
            expect(await contest.candidate(0, 1)).to.be.equal("최고야!")

            await contest.connect(other).registerCandidate("오케이 땡큐!", mates1.address, [15, 16, 17, 18, 19]);
            expect(await contest.candidateCount(0)).to.be.equal(3)
            expect(await contest.candidate(0, 2)).to.be.equal("오케이 땡큐!")
            expect(await contest.candidateRegister(0, 2)).to.be.equal(other.address)

            await network.provider.send("evm_setAutomine", [false]);
            await mine(20);
            await network.provider.send("evm_setAutomine", [true]);

            await contest.vote(2, mates1.address, [10, 11, 12, 13, 14]);
            await contest.connect(other).vote(1, mates1.address, [20, 21, 22, 23, 24]);
            expect(await contest.elected(0)).to.be.equal(1)
            expect(await contest.totalVotes(0)).to.be.equal(25)
            expect(await contest.userVotes(0, admin.address)).to.be.equal(15)

            await mine(200);
            expect(await contest.elected(0)).to.be.equal(1)

            await expect(contest.mintWinnerNFT(0)).not.to.reverted;
            await expect(contest.mintWinnerNFT(0)).to.reverted;
            await expect(contest.mintWinnerNFT(1)).to.reverted;

            expect(await winners.dogeSounds(0)).to.be.equal("최고야!")
        })

        it("vote2", async () => {

            await mates1.addMinter(other.address);
            await mates2.addMinter(other.address);

            for (let i = 0; i < 10; i += 1) {
                await mates1.mint(admin.address, i);
            }

            for (let i = 10; i < 20; i += 1) {
                await mates1.mint(other.address, i);
            }

            for (let i = 0; i < 10; i += 1) {
                await mates2.mint(admin.address, i);
            }

            for (let i = 10; i < 20; i += 1) {
                await mates2.mint(other.address, i);
            }

            await contest.setHolidayInterval(40);
            await contest.setCandidateInterval(20);
            await contest.setVoteInterval(20);

            await contest.registerCandidate("도지사운드클럽", mates1.address, [0, 1, 2, 3, 4]);
            expect(await contest.candidateCount(0)).to.be.equal(1)
            expect(await contest.candidate(0, 0)).to.be.equal("도지사운드클럽")

            await contest.registerCandidate("최고야!", mates2.address, [0, 1, 2, 3, 4]);
            expect(await contest.candidateCount(0)).to.be.equal(2)
            expect(await contest.candidate(0, 1)).to.be.equal("최고야!")

            await contest.connect(other).registerCandidate("오케이 땡큐!", mates1.address, [10, 11, 12, 13, 14]);
            expect(await contest.candidateCount(0)).to.be.equal(3)
            expect(await contest.candidate(0, 2)).to.be.equal("오케이 땡큐!")
            expect(await contest.candidateRegister(0, 2)).to.be.equal(other.address)

            await contest.connect(other).registerCandidate("고맙습니다.", mates2.address, [10, 11, 12, 13, 14]);
            expect(await contest.candidateCount(0)).to.be.equal(4)
            expect(await contest.candidate(0, 3)).to.be.equal("고맙습니다.")
            expect(await contest.candidateRegister(0, 3)).to.be.equal(other.address)

            await network.provider.send("evm_setAutomine", [false]);
            await mine(20);
            await network.provider.send("evm_setAutomine", [true]);

            await contest.vote(3, mates1.address, [5, 6, 7, 8, 9]);
            await contest.connect(other).vote(2, mates1.address, [15, 16, 17, 18, 19]);

            await contest.vote(1, mates2.address, [5, 6, 7, 8, 9]);
            await contest.connect(other).vote(3, mates2.address, [15, 16, 17, 18, 19]);

            expect(await contest.elected(0)).to.be.equal(3)
            expect(await contest.totalVotes(0)).to.be.equal(40)
            expect(await contest.userVotes(0, admin.address)).to.be.equal(20)

            await mine(200);
            expect(await contest.elected(0)).to.be.equal(3)

            await expect(contest.connect(other).mintWinnerNFT(0)).not.to.reverted;
            await expect(contest.connect(other).mintWinnerNFT(0)).to.reverted;
            await expect(contest.connect(other).mintWinnerNFT(1)).to.reverted;
            
            expect(await winners.dogeSounds(0)).to.be.equal("고맙습니다.")
        })
    })
})