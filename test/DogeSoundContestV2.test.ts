import { expect } from "chai";
import { ethers, network, waffle } from "hardhat";
import DogeSoundClubMateArtifact from "../artifacts/contracts/DogeSoundClubMate.sol/DogeSoundClubMate.json";
import DogeSoundContestV2Artifact from "../artifacts/contracts/DogeSoundContestV2.sol/DogeSoundContestV2.json";
import DogeSoundsArtifact from "../artifacts/contracts/DogeSounds.sol/DogeSounds.json";
import { DogeSounds } from "../typechain";
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
    let dogeSounds: DogeSounds;
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

        dogeSounds = await deployContract(
            admin,
            DogeSoundsArtifact,
            []
        ) as DogeSounds;

        contest = await deployContract(
            admin,
            DogeSoundContestV2Artifact,
            [await provider.getBlockNumber(), dogeSounds.address]
        ) as DogeSoundContestV2;

        await contest.allowMates(mates1.address);
        await contest.allowMates(mates2.address);
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
        })
    })
})