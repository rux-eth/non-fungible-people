// SPDX-License-Identifier: MIT
// Author: The Non-Fungible People Project
// Developed by TheBigMort

pragma solidity ^0.8.7;

// Openzep imports
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

// local imports
import "../interfaces/INFPEditions.sol";

abstract contract NFPEditions is Ownable, INFPEditions {
    using Strings for uint256;
    mapping(uint256 => uint256) private editions;
    /*
     * Stores the provenance hash of each edition.
     *
     * Read about the importance of provenance hashes in
     * NFTs here: https://medium.com/coinmonks/the-elegance-of-the-nft-provenance-hash-solution-823b39f99473
     */
    mapping(uint256 => string) private edProv;
    mapping(uint256 => string) private edURI;
    /*
     * Stores edition information for each tokenId
     *
     * Each index in tokens represents a tokenId.
     *
     * byte    1: edIndex of the edition that the token associates with. Returns
     *            zero if tokenId is a claimable(unmut)
     * bytes 2-3: tokenIdOfedition(supply of that edition at the time of minting).
                  or the claimId if the tokenId is a claimable(unmut)
     *
     */
    uint24[] private tokens;

    // track claim nonces
    mapping(address => uint256) private _claimNonce;

    address private _admin;

    modifier onlyTeam() {
        require(
            msg.sender == admin() || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    function setEditionStartIndex(uint256 edIndex) external override {
        (
            ,
            uint256 MAX_SUPPLY,
            ,
            ,
            ,
            uint256 startIndex,
            uint256 startIndexBlock,
            ,
            ,
            ,

        ) = getEdition(edIndex);
        require(startIndexBlock != 0, "Starting index block not set");
        require(startIndex == 0, "Starting index already set");
        bytes32 blockHash = blockhash(startIndexBlock);
        uint256 si = uint256(blockHash) % MAX_SUPPLY;
        if (blockHash == bytes32(0)) {
            si = uint256(blockhash(block.number - 1)) % MAX_SUPPLY;
        }
        if (si == 0) {
            si += 1;
        }
        editions[edIndex] = editions[edIndex] |= si << 152;

        emit EditionStartIndexSet(edIndex, si);
        delete si;
        delete blockHash;
    }

    function setEdition(
        uint256 edIndex,
        uint256 MAX_SUPPLY,
        uint256 REVEAL_TIMESTAMP,
        uint256 PUBLIC_TIMESTAMP,
        uint256 price,
        bool status,
        string calldata provHash,
        string calldata _edURI
    ) external onlyTeam {
        require(!_edExists(edIndex), "Edition already exists");
        require(
            edIndex <= type(uint8).max &&
                MAX_SUPPLY <= type(uint16).max &&
                REVEAL_TIMESTAMP <= type(uint64).max &&
                price <= type(uint64).max,
            "Value is too big!"
        );
        uint256 edition = edIndex;
        edition |= MAX_SUPPLY << 8;
        edition |= REVEAL_TIMESTAMP << 24;
        edition |= PUBLIC_TIMESTAMP << 56;
        edition |= price << 88;
        edition |= uint256(status ? 1 : 0) << 232;
        editions[edIndex] = edition;
        edProv[edIndex] = provHash;
        edURI[edIndex] = _edURI;
        emit EditionSet(
            edIndex,
            MAX_SUPPLY,
            REVEAL_TIMESTAMP,
            price,
            status,
            provHash,
            _edURI
        );
    }

    function setEditionPrice(uint256 edIndex, uint256 newPrice)
        external
        onlyTeam
    {
        require(_edExists(edIndex), "edition does not exist");
        require(newPrice <= type(uint64).max, "Too high");
        (
            ,
            ,
            ,
            ,
            ,
            uint256 startIndex,
            uint256 startIndexBlock,
            bool status,
            uint256 supply,
            ,

        ) = getEdition(edIndex);
        uint256 edition = uint256(uint88(editions[edIndex]));
        edition |= newPrice << 88;
        edition |= startIndex << 152;
        edition |= startIndexBlock << 192;
        edition |= uint256(status ? 1 : 0) << 232;
        edition |= supply << 240;
        editions[edIndex] = edition;
    }

    function setEditionStatus(uint256 edIndex, bool newStatus)
        external
        onlyTeam
    {
        require(_edExists(edIndex), "edition does not exist");
        (
            ,
            ,
            ,
            ,
            uint256 price,
            uint256 startIndex,
            uint256 startIndexBlock,
            ,
            uint256 supply,
            ,

        ) = getEdition(edIndex);
        uint256 edition = uint256(uint88(editions[edIndex]));
        edition |= price << 88;
        edition |= startIndex << 152;
        edition |= startIndexBlock << 192;
        edition |= uint256(newStatus ? 1 : 0) << 232;
        edition |= supply << 240;
        editions[edIndex] = edition;
    }

    function setEditionURI(uint256 edIndex, string memory newURI)
        external
        onlyTeam
    {
        edURI[edIndex] = newURI;
    }

    function setAdmin(address newAdmin) external onlyOwner {
        _admin = newAdmin;
    }

    function claimNonce(address _address)
        public
        view
        override
        returns (uint256)
    {
        return _claimNonce[_address];
    }

    function getToken(uint256 id)
        public
        view
        override
        returns (uint256 edIndex, uint256 tokenIdOfedition)
    {
        uint256 token = tokens[id];
        edIndex = uint8(token);
        tokenIdOfedition = uint16(token >> 8);
    }

    function getEdition(uint256 edIndex)
        public
        view
        override
        returns (
            uint256 editionIndex,
            uint256 MAX_SUPPLY,
            uint256 REVEAL_TIMESTAMP,
            uint256 PUBLIC_TIMESTAMP,
            uint256 price,
            uint256 startIndex,
            uint256 startIndexBlock,
            bool status,
            uint256 supply,
            string memory provHash,
            string memory _edURI
        )
    {
        require(_edExists(edIndex), "edition does not exist");
        uint256 edition = editions[edIndex];
        editionIndex = uint8(edition);
        MAX_SUPPLY = uint256(uint16(edition >> 8));
        REVEAL_TIMESTAMP = uint256(uint32(edition >> 24));
        PUBLIC_TIMESTAMP = uint256(uint32(edition >> 56));
        price = uint256(uint64(edition >> 88));
        startIndex = uint256(uint40(edition >> 152));
        startIndexBlock = uint256(uint40(edition >> 192));
        status = uint8(edition >> 232) == 1;
        supply = uint256(uint16(edition >> 240));
        provHash = edProv[edIndex];
        _edURI = edURI[edIndex];
    }

    function getAllTokens()
        public
        view
        override
        returns (uint256[] memory edIndexs, uint256[] memory tokenIdsOfeditions)
    {
        edIndexs = new uint256[](totalSupply());
        tokenIdsOfeditions = new uint256[](totalSupply());
        for (uint256 i = 0; i < totalSupply(); i++) {
            (edIndexs[i], tokenIdsOfeditions[i]) = getToken(i);
        }
    }

    function tokenIdsOfEdition(uint256 edIndex)
        public
        view
        override
        returns (uint256[] memory tokenIds)
    {
        require(_edExists(edIndex), "edition does not exist");
        (, , , , , , , , uint256 supply, , ) = getEdition(edIndex);
        uint256 counter = 0;
        tokenIds = new uint256[](supply);
        for (uint256 i = 0; i < totalSupply(); i++) {
            (uint256 editionIndex, ) = getToken(i);
            if (editionIndex == edIndex) {
                tokenIds[counter] = i;
                counter++;
            }
        }
    }

    function totalSupply() public view override returns (uint256) {
        return tokens.length;
    }

    function _setEditionStartIndexBlock(uint256 edIndex) internal {
        (
            ,
            ,
            ,
            ,
            uint256 price,
            uint256 startIndex,
            uint256 startIndexBlock,
            bool status,
            uint256 supply,
            ,

        ) = getEdition(edIndex);
        if (startIndexBlock == 0) {
            uint256 bn = block.number;
            uint256 edition = uint256(uint88(editions[edIndex]));
            edition |= price << 88;
            edition |= startIndex << 152;
            edition |= bn << 192;
            edition |= uint256(status ? 1 : 0) << 232;
            edition |= supply << 240;
            editions[edIndex] = edition;
            emit EditionStartIndexBlockSet(edIndex, bn);
        }
    }

    function _checkReveal(uint256 edIndex) internal {
        (
            ,
            uint256 MAX_SUPPLY,
            uint256 REVEAL_TIMESTAMP,
            ,
            ,
            uint256 startIndex,
            ,
            ,
            uint256 supply,
            ,

        ) = getEdition(edIndex);
        if (
            startIndex == 0 &&
            ((supply == MAX_SUPPLY) || block.timestamp >= REVEAL_TIMESTAMP)
        ) {
            _setEditionStartIndexBlock(edIndex);
        }
    }

    function _claimed(
        address sender,
        uint256 tokenIndex,
        uint256 edIndex
    ) internal {
        _claimNonce[sender]++;
        _increaseEditionSupply(edIndex, 1);
        emit Claimed(sender, _claimNonce[sender], tokenIndex, edIndex);
    }

    function _increaseEditionSupply(uint256 edIndex, uint256 numMints)
        internal
    {
        (, , , , , , , , uint256 supply, , ) = getEdition(edIndex);
        uint256 temp = editions[edIndex];
        temp = uint256(uint240(temp));
        editions[edIndex] = temp |= (supply + numMints) << 240;
        for (uint256 i = 0; i < numMints; i++) {
            temp = uint8(edIndex);
            temp |= (supply + i) << 8;
            tokens.push(uint24(temp));
        }
    }

    function admin() internal view returns (address) {
        return _admin;
    }

    function _getURI(uint256 id) internal view returns (string memory uri) {
        (uint256 edIndex, uint256 tokenIdOfEdition) = getToken(id);
        return
            string(
                abi.encodePacked(edURI[edIndex], tokenIdOfEdition.toString())
            );
    }

    // check if a edition exists
    function _edExists(uint256 edIndex) internal view returns (bool) {
        return editions[edIndex] != uint256(0);
    }

    function _exists(uint256 id) internal view returns (bool) {
        return id < tokens.length && id >= 0;
    }
}
